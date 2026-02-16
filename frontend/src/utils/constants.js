
export const estadoPorDdd = {
  11: 'SP',
  12: 'SP',
  13: 'SP',
  14: 'SP',
  15: 'SP',
  16: 'SP',
  17: 'SP',
  18: 'SP',
  19: 'SP',
  21: 'RJ',
  22: 'RJ',
  24: 'RJ',
  27: 'ES',
  28: 'ES',
  31: 'MG',
  32: 'MG',
  33: 'MG',
  34: 'MG',
  35: 'MG',
  37: 'MG',
  38: 'MG',
  41: 'PR',
  42: 'PR',
  43: 'PR',
  44: 'PR',
  45: 'PR',
  46: 'PR',
  47: 'SC',
  48: 'SC',
  49: 'SC',
  51: 'RS',
  53: 'RS',
  54: 'RS',
  55: 'RS',
  61: 'DF',
  62: 'GO',
  63: 'TO',
  64: 'GO',
  65: 'MT',
  66: 'MT',
  67: 'MS',
  68: 'AC',
  69: 'RO',
  71: 'BA',
  73: 'BA',
  74: 'BA',
  75: 'BA',
  77: 'BA',
  79: 'SE',
  81: 'PE',
  82: 'AL',
  83: 'PB',
  84: 'RN',
  85: 'CE',
  86: 'PI',
  87: 'PE',
  88: 'CE',
  89: 'PI',
  91: 'PA',
  92: 'AM',
  93: 'PA',
  94: 'PA',
  95: 'RR',
  96: 'AP',
  97: 'AM',
  98: 'MA',
  99: 'MA'
}

export const dddsPorEstado = {
  AC: ['68'],
  AL: ['82'],
  AM: ['92', '97'],
  AP: ['96'],
  BA: ['71', '73', '74', '75', '77'],
  CE: ['85', '88'],
  DF: ['61'],
  ES: ['27', '28'],
  GO: ['62', '64'],
  MA: ['98', '99'],
  MG: ['31', '32', '33', '34', '35', '37', '38'],
  MS: ['67'],
  MT: ['65', '66'],
  PA: ['91', '93', '94'],
  PB: ['83'],
  PE: ['81', '87'],
  PI: ['86', '89'],
  PR: ['41', '42', '43', '44', '45', '46'],
  RJ: ['21', '22', '24'],
  RN: ['84'],
  RO: ['69'],
  RR: ['95'],
  RS: ['51', '53', '54', '55'],
  SC: ['47', '48', '49'],
  SE: ['79'],
  SP: ['11', '12', '13', '14', '15', '16', '17', '18', '19'],
  TO: ['63']
}

export const estadosBR = [
  { nome: 'Acre', sigla: 'AC' },
  { nome: 'Alagoas', sigla: 'AL' },
  { nome: 'Amapá', sigla: 'AP' },
  { nome: 'Amazonas', sigla: 'AM' },
  { nome: 'Bahia', sigla: 'BA' },
  { nome: 'Ceará', sigla: 'CE' },
  { nome: 'Distrito Federal', sigla: 'DF' },
  { nome: 'Espírito Santo', sigla: 'ES' },
  { nome: 'Goiás', sigla: 'GO' },
  { nome: 'Maranhão', sigla: 'MA' },
  { nome: 'Mato Grosso', sigla: 'MT' },
  { nome: 'Mato Grosso do Sul', sigla: 'MS' },
  { nome: 'Minas Gerais', sigla: 'MG' },
  { nome: 'Pará', sigla: 'PA' },
  { nome: 'Paraíba', sigla: 'PB' },
  { nome: 'Paraná', sigla: 'PR' },
  { nome: 'Pernambuco', sigla: 'PE' },
  { nome: 'Piauí', sigla: 'PI' },
  { nome: 'Rio de Janeiro', sigla: 'RJ' },
  { nome: 'Rio Grande do Norte', sigla: 'RN' },
  { nome: 'Rio Grande do Sul', sigla: 'RS' },
  { nome: 'Rondônia', sigla: 'RO' },
  { nome: 'Roraima', sigla: 'RR' },
  { nome: 'Santa Catarina', sigla: 'SC' },
  { nome: 'São Paulo', sigla: 'SP' },
  { nome: 'Sergipe', sigla: 'SE' },
  { nome: 'Tocantins', sigla: 'TO' }

]

export const messagesLog = {
  access: {
    message: 'Acessou o ticket',
    color: 'grey-8',
    icon: 'mdi-eye'
  },
  peek: {
    message: 'Visualizou o ticket (sem abrir)',
    color: 'grey-5',
    icon: 'mdi-eye-outline'
  },
  closed: {
    message: 'Encerrou o ticket',
    color: 'positive',
    icon: 'mdi-check-circle-outline'
  },
  create: {
    message: 'Ticket criado',
    color: 'green-6',
    icon: 'mdi-plus-circle'
  },
  delete: {
    message: 'Deletou o Ticket',
    color: 'negative',
    icon: 'mdi-delete'
  },
  open: {
    message: 'Iniciou o atendimento',
    color: 'primary',
    icon: 'mdi-play-circle-outline'
  },
  pending: {
    message: 'Retornou para fila de pendentes',
    color: 'amber',
    icon: 'mdi-account-convert'
  },
  transfered: {
    message: 'Transferiu o atendimento',
    color: 'teal-3',
    icon: 'mdi-account-arrow-right'
  },
  receivedTransfer: {
    message: 'Recebeu por transferência',
    color: 'teal-5',
    icon: 'mdi-account-arrow-left'
  },
  queue: {
    message: 'Bot definiu a fila',
    color: 'green-5',
    icon: 'mdi-arrow-decision'
  },
  queueChanged: {
    message: 'Alterou a fila do ticket',
    color: 'indigo-4',
    icon: 'mdi-swap-horizontal'
  },
  userDefine: {
    message: 'Bot definiu o usuário',
    color: 'cyan-5',
    icon: 'mdi-account-check'
  },
  assignedToUser: {
    message: 'Atribuiu ticket a usuário',
    color: 'purple-4',
    icon: 'mdi-account-arrow-right-outline'
  },
  retriesLimitQueue: {
    message: 'Bot: Fila definida (Limite de tentativas)',
    color: 'green-2',
    icon: 'mdi-arrow-decision'
  },
  retriesLimitUserDefine: {
    message: 'Bot: Usuário definido (Limite de tentativas)',
    color: 'cyan-2',
    icon: 'mdi-account-check'
  },
  chatBot: {
    message: 'ChatBot iniciado',
    color: 'blue-4',
    icon: 'mdi-robot'
  },
  autoClose: {
    message: 'Bot: Atendimento fechado pelo cliente',
    color: 'blue-8',
    icon: 'mdi-check-circle-outline'
  },
  messageSent: {
    message: 'Enviou mensagem',
    color: 'light-blue-6',
    icon: 'mdi-send'
  },
  messageScheduled: {
    message: 'Agendou mensagem',
    color: 'deep-orange-5',
    icon: 'mdi-clock-outline'
  },
  userJoined: {
    message: 'Entrou no atendimento',
    color: 'green-5',
    icon: 'mdi-login'
  },
  userLeft: {
    message: 'Saiu do atendimento',
    color: 'red-5',
    icon: 'mdi-logout'
  },
  alreadyInService: {
    message: 'Tentou abrir ticket já em atendimento',
    color: 'orange-6',
    icon: 'mdi-alert-circle'
  },
  contactsCreate: {
    message: 'Ticket criado via Contatos',
    color: 'deep-purple-4',
    icon: 'mdi-account-plus'
  },
  contactsOpened: {
    message: 'Ticket aberto pela tela de Contatos',
    color: 'deep-purple-2',
    icon: 'mdi-account-search'
  },
  contactsAttended: {
    message: 'Ticket atendido pela tela de Contatos',
    color: 'indigo-5',
    icon: 'mdi-headset'
  },
  supportCreate: {
    message: 'Ticket de suporte criado',
    color: 'teal-4',
    icon: 'mdi-lifebuoy'
  },
  supportOpened: {
    message: 'Ticket de suporte aberto',
    color: 'teal-5',
    icon: 'mdi-headset-earbud'
  },
  supportAttended: {
    message: 'Atendimento de suporte iniciado',
    color: 'teal-7',
    icon: 'mdi-headset'
  },
  statusChanged: {
    message: 'Alterou status do ticket',
    color: 'blue-grey-5',
    icon: 'mdi-sync'
  },
  evaluationStarted: {
    message: 'Avaliação iniciada',
    color: 'orange',
    icon: 'mdi-star-check'
  },
  evaluationCompleted: {
    message: 'Avaliação concluída',
    color: 'green-6',
    icon: 'mdi-star-check-outline'
  },
  evaluationExpired: {
    message: 'Avaliação expirou (sem resposta)',
    color: 'grey-6',
    icon: 'mdi-timer-off-outline'
  },
  flowClosed: {
    message: 'Fluxo encerrado',
    color: 'grey-7',
    icon: 'mdi-flow'
  }
}
