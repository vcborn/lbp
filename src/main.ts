import toml from "toml"
import fs from "fs"
import path from "path"
import { cac } from 'cac'
import { exec, execSync } from 'child_process'
import kleur from 'kleur';

const cli = cac("lbp")

const readConfig = () => {
  try {
    const file = fs.readFileSync("config.toml", 'utf8')
    return (toml.parse(file))
  } catch (err) {
    return err
  }
}

const setConfig = () => {
  const data = readConfig()
  const options = [
    `-a ${data.debian.arch}`,
    `--archive-areas ${data.debian.areas}`,
    `--bootloaders ${data.debian.arch == "arm64" ? "grub-efi" : "grub-pc"}`,
    `--bootappend-live "boot=live components locales=${data.locale.lang}.UTF-8 keyboard-layouts=${data.locale.layouts}"`,
    `--compression gzip`,
    `-d ${data.debian.dist}`,
    `--hdd-label ${data.label.hdd}`,
    `--iso-preparer ${data.publisher.name}; ${data.publisher.website}; ${data.publisher.email}`,
    `--iso-publisher ${data.publisher.name}; ${data.publisher.website}; ${data.publisher.email}`,
    `--iso-volume ${data.label.iso}`,
    `--mirror-binary ${data.mirror.main}`,
    `--mirror-binary-security ${data.mirror.security}`,
    `--mirror-bootstrap ${data.mirror.main}`,
    `--mirror-chroot ${data.mirror.main}`,
    `--mirror-chroot-security ${data.mirror.security}`,
    `--mirror-debian-installer ${data.mirror.main}`,
    `--parent-archive-areas ${data.debian.areas}`,
    `--parent-distribution ${data.debian.dist}`,
    `--parent-distribution-chroot ${data.debian.dist}`,
    `--parent-distribution-binary ${data.debian.dist}`,
    `--parent-mirror-binary ${data.mirror.main}`,
    `--parent-mirror-binary-security ${data.mirror.security}`,
    `-m ${data.mirror.main}`,
    `--parent-mirror-chroot ${data.mirror.main}`,
    `--parent-mirror-chroot-security ${data.mirror.security}`,
    `--parent-mirror-debian-installer ${data.mirror.main}`,
  ]
  execSync(`lb config ${options.join(" ")}`)
}

const checklb = () => {
  let check = true
  exec("lb -v", (error) => {
    if (error && (error.message.includes("not recognized") || error.message.includes("not found"))) {
      check = false
      console.log(`install ${kleur.bold("live-build")} and ${kleur.bold("live-config")}`)
    }
  })
  return check
}

const checkConfig = () => {
  let check = true
  if (!checklb() || !fs.existsSync('config.toml')) {
    check = false
    console.log("init project")
  }
  return check
}

cli.command('init', 'Init Project').action(() => {
  if (checklb()) {
    if (fs.existsSync('config.toml')) {
      console.log('config already exists.')
    } else {
      fs.copyFileSync(path.join(__dirname, '/config.example.toml'), 'config.toml')
      execSync("lb config")
    }
  }
})

cli.command("download", "Download Specified Packages").action(() => {
  if (checkConfig()) {
    console.log("downloading")
  }
})

cli.command("build", "Build ISO").action(() => {
  if (checkConfig()) {
    setConfig()
    execSync("sudo lb build")
  }
})

cli.help()

cli.version('1.0.0')

cli.parse()