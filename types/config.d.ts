type config = {
  name: string,
  debian: {
    dist: string,
    arch: string,
    areas: string,
  },
  mirror: {
    main: string,
    security: string
  },
  publisher: {
    name: string,
    website?: string,
    email?: string,
  },
  label: {
    hdd: string,
    iso: string
  },
  locale: {
    lang: string,
    layouts: string
  },
  packages: {
    repo: {
      name: string,
      uri: string,
      dist: string,
      key?: string
    }[]
  }
}