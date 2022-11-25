# Live Build Plus

Tools for those who find the Live Build system too complex.

## Usage

```bash
# First, create a project folder
$ mkdir iso
# Then initialize LBP in that folder
$ cd iso && lbp init
# After making some configuration changes, build
$ lbp build
```

See comments about configurations.

## File system

### `root`

This is the location that will be the root directory of the ISO image to be created.

If you want to add, for example, a default configuration for a user, add it to `lbp/root/etc/skel/.config/...`.

### `local-pkgs`

Add the package (.deb) to be installed.

The file naming conventions must follow the deb package specification.

### `remote-pkgs`

Add the packages you want to install from debian's apt repository or your added apt repository.

Packages are separated one by one with a new line.

The file name must always end with `.list.chroot`.

# Build

```bash
$ git clone https://github.com/vcborn/lbp.git
$ cd lbp
$ npm i
$ npm run build
$ npm run pack
```

# License

[Apache-2.0](https://github.com/vcborn/lbp/blob/main/LICENSE)