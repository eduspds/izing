import request from 'src/service/request'

export function ListarReleases (params = {}) {
  return request({
    url: '/public/releases',
    method: 'get',
    params
  })
}

export function ObterRelease (id) {
  return request({
    url: `/public/releases/${id}`,
    method: 'get'
  })
}

export function ObterUltimaRelease () {
  return request({
    url: '/public/latest-release',
    method: 'get'
  })
}

export function MarcarVersaoComoVista (version) {
  return request({
    url: '/public/mark-version-seen',
    method: 'post',
    data: { version }
  })
}
