import request from 'src/service/request'

export function ListarWhatsapps (whatsAppId) {
  return request({
    url: '/whatsapp/',
    method: 'get'
  })
}

export function StartWhatsappSession (whatsAppId) {
  return request({
    url: `/whatsappsession/${whatsAppId}`,
    method: 'post'
  })
}

export function DeleteWhatsappSession (whatsAppId) {
  return request({
    url: `/whatsappsession/${whatsAppId}`,
    method: 'delete'
  })
}

export function RequestNewQrCode (data) {
  return request({
    url: `/whatsappsession/${data.id}`,
    method: 'put',
    data
  })
}

export function GetWhatSession (whatsAppId) {
  return request({
    url: `/whatsapp/${whatsAppId}`,
    method: 'get'
  })
}

export function UpdateWhatsapp (whatsAppId, data) {
  return request({
    url: `/whatsapp/${whatsAppId}`,
    method: 'put',
    data
  })
}

export function CriarWhatsapp (data) {
  return request({
    url: '/whatsapp',
    method: 'post',
    data
  })
}

export function DeletarWhatsapp (whatsAppId) {
  return request({
    url: `/whatsapp/${whatsAppId}`,
    method: 'delete'
  })
}

export function ReconnectWhatsappSession (whatsAppId) {
  return request({
    url: `/whatsappsession/${whatsAppId}/reconnect`,
    method: 'post'
  })
}

export function CloseWhatsappSession (whatsAppId) {
  return request({
    url: `/whatsapp/${whatsAppId}/close`,
    method: 'post'
  })
}

export function VerificarMensagensPendentes (whatsAppId) {
  return request({
    url: `/whatsapp/${whatsAppId}/pending-messages`,
    method: 'get'
  })
}

export function VerificarMensagensOrfas () {
  return request({
    url: '/whatsapp/orphaned-messages',
    method: 'get'
  })
}

export function TransferirMensagensOrfas (whatsAppId) {
  return request({
    url: `/whatsapp/${whatsAppId}/transfer-orphaned-messages`,
    method: 'post'
  })
}

// api.put(`/whatsapp/${whatsAppId}`, {
//   name: values.name,
//   isDefault: values.isDefault,
// });
