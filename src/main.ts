import util from "util"
import toml from "toml"
import fs from "fs"
import path from "path"
import { cac } from 'cac'
import { execSync } from 'child_process'
import kleur from 'kleur'

const cli = cac("lbp")

const copyFilePromise = util.promisify(fs.copyFile);
const rmPromise = util.promisify(fs.rm);

const copyFiles = (srcDir: string, destDir: string) => {
  const files = fs.readdirSync(srcDir)
  return Promise.all(files.map((f: string) => {
    return copyFilePromise(path.join(srcDir, f), path.join(destDir, f))
  }))
}

const rmFiles = (dir: string) => {
  const files = fs.readdirSync(dir)
  return Promise.all(files.map((f: string) => {
    return rmPromise(path.join(dir, f))
  }))
}

const readConfig = (): config => {
  const file = fs.readFileSync("config.toml", 'utf8')
  return (toml.parse(file))
}

const setConfig = async (q?: boolean) => {
  if (checkConfig()) {
    const data = readConfig()
    if (data) {
      const options = [
        `-a "${data.debian.arch}"`,
        `--archive-areas "${data.debian.areas}"`,
        `--bootloaders "${data.debian.arch == "arm64" ? "grub-efi" : "grub-pc"}"`,
        `--bootappend-live "boot=live components locales=${data.locale.lang}.UTF-8 keyboard-layouts=${data.locale.layouts}"`,
        `--compression gzip`,
        `-d "${data.debian.dist}"`,
        `--hdd-label "${data.label.hdd}"`,
        `--iso-preparer "${data.publisher.name}; ${data.publisher.website}; ${data.publisher.email}"`,
        `--iso-publisher "${data.publisher.name}; ${data.publisher.website}; ${data.publisher.email}"`,
        `--iso-volume "${data.label.iso}"`,
        `--mirror-binary "${data.mirror.main}"`,
        `--mirror-binary-security "${data.mirror.security}"`,
        `--mirror-bootstrap "${data.mirror.main}"`,
        `--mirror-chroot "${data.mirror.main}"`,
        `--mirror-chroot-security "${data.mirror.security}"`,
        `--mirror-debian-installer "${data.mirror.main}"`,
        `--parent-archive-areas "${data.debian.areas}"`,
        `--parent-distribution "${data.debian.dist}"`,
        `--parent-distribution-chroot "${data.debian.dist}"`,
        `--parent-distribution-binary "${data.debian.dist}"`,
        `--parent-mirror-binary "${data.mirror.main}"`,
        `--parent-mirror-binary-security "${data.mirror.security}"`,
        `-m "${data.mirror.main}"`,
        `--parent-mirror-chroot "${data.mirror.main}"`,
        `--parent-mirror-chroot-security "${data.mirror.security}"`,
        `--parent-mirror-debian-installer "${data.mirror.main}"`,
      ]
      execSync(`lb config ${options.join(" ")} ${q ? "--quiet" : ""}`)
      rmFiles("config/includes.chroot")
      rmFiles("config/packages.chroot")
      rmFiles("config/package-lists")
      rmFiles("config/archives")
      copyFiles("lbp/root", "config/includes.chroot")
      copyFiles("lbp/local-pkgs", "config/packages.chroot")
      copyFiles("lbp/remote-pkgs", "config/package-lists")
      data.packages.repo.map((d) => {
        fs.writeFileSync(`config/archives/${d.name}.list.binary`, `deb ${d.uri} ${d.dist} main`)
        fs.copyFileSync(`config/archives/${d.name}.list.binary`, `config/archives/${d.name}.list.chroot`)
        if (d.key) {
          getKey(d.key, d.name)
        }
      })
    }
  }
}

const checklb = () => {
  let check = true
  try {
    execSync("lb -v", {
      stdio: 'ignore'
    })
  } catch (err) {
    check = false
    console.error(`install ${kleur.bold("live-build")} and ${kleur.bold("live-config")}`)
  }
  return check
}

const checkConfig = () => {
  let check = true
  if (!checklb() || !fs.existsSync('config.toml') || !fs.existsSync("lbp")) {
    check = false
    console.error("init project")
  }
  return check
}

const getKey = async (key: string, name: string) => {
  const ida = await fetch("https://keyserver.ubuntu.com/pks/lookup", {
    body: JSON.stringify({
      op: "index",
      fingerprint: "on",
      search: key
    })
  })
  const id = (await ida.text()).split(/\r\n|\r|\n/)[3].match(/Search results for '(.*)'/)
  const pub = await fetch("https://keyserver.ubuntu.com/pks/lookup", {
    body: JSON.stringify({
      op: "get",
      search: id
    })
  })
  fs.writeFileSync(`config/archives/${name}.temp.key`, await pub.text())
  execSync(`gpg -o config/archives/${name}.list.binary.key --dearmor config/archives/${name}.temp.key`, {
    stdio: "ignore"
  })
  fs.copyFileSync(`config/archives/${name}.list.binary.key`, `config/archives/${name}.list.chroot.key`)
  fs.rmSync("config/archives/${name}.temp.key")
}

cli.command('init', 'Init Project').action((options) => {
  if (options.force) {
    if (fs.existsSync('config.toml')) {
      fs.rmSync("config.toml")
    }
    if (fs.existsSync("lbp")) {
      fs.rmdirSync("lbp")
    }
  }
  if (checklb()) {
    if (fs.existsSync('config.toml')) {
      if (!options.quiet) {
        console.log('config already exists.')
      }
    } else {
      fs.copyFileSync(path.join(__dirname, '/config.example.toml'), 'config.toml')
      if (!fs.existsSync("lbp")) {
        fs.mkdirSync('lbp')
        fs.mkdirSync('lbp/local-pkgs')
        fs.mkdirSync('lbp/remote-pkgs')
        fs.writeFileSync(`lbp/remote-pkgs/live.list.chroot`, "live-boot\nlive-config\nlive-config-systemd")
        fs.mkdirSync('lbp/root')
      }
      execSync(`lb config ${options.quiet ? "--quiet" : ""}`)
    }
  }
})

cli.command("update", "Update config").action((options) => {
  setConfig(options.quiet)
})

cli.command("build", "Build ISO").action((options) => {
  if (checkConfig()) {
    setConfig()
    execSync(`sudo lb build ${options.quiet ? "--quiet" : ""}`)
  }
})

cli.option('--force', "force.")
cli.option('--quiet', 'be quiet.')

cli.help()

cli.version('1.0.0')

cli.parse()