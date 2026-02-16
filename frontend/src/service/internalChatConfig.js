import request from 'src/service/request'

export function obterConfiguracaoChatInterno () {
  return request({
    url: '/internal-chat/config',
    method: 'get'
  })
}

export function salvarConfiguracaoChatInterno (data) {
  return request({
    url: '/internal-chat/config',
    method: 'put',
    data
  })
}
