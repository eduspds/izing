import request from 'src/service/request'

export function ListarTicketKanbans () {
  return request({
    url: '/ticket-kanbans',
    method: 'get'
  })
}

export function BuscarUmTicketKanban (ticketKanbanId) {
  return request({
    url: `/ticket-kanbans/${ticketKanbanId}`,
    method: 'get'
  })
}

export function CriarTicketKanban (data) {
  return request({
    url: '/ticket-kanbans',
    method: 'post',
    data
  })
}

export function AtualizarTicketKanban (ticketKanbanId, data) {
  return request({
    url: `/ticket-kanbans/${ticketKanbanId}`,
    method: 'put',
    data
  })
}

export function AtualizarStatusTicketKanban (ticketKanbanId, status) {
  return request({
    url: `/ticket-kanbans/${ticketKanbanId}/status`,
    method: 'patch',
    data: { status }
  })
}

export function DeletarTicketKanban (ticketKanbanId) {
  return request({
    url: `/ticket-kanbans/${ticketKanbanId}`,
    method: 'delete'
  })
}
