import request from 'src/service/request'

export function ListarConfiguracoes (params) {
  return request({
    url: '/settings/',
    method: 'get',
    params
  })
}

export function AlterarConfiguracao (data) {
  const key = data.key || data.Key
  return request({
    url: `/settings/${key}/`,
    method: 'put',
    data
  })
}
