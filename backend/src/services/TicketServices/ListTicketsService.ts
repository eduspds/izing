/* eslint-disable eqeqeq */
import { QueryTypes } from "sequelize";
// import { startOfDay, endOfDay, parseISO } from "date-fns";

import Ticket from "../../models/Ticket";
import UsersQueues from "../../models/UsersQueues";
import UserManagerQueues from "../../models/UserManagerQueues";
import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";
// import ListSettingsService from "../SettingServices/ListSettingsService";
// import Queue from "../../models/Queue";
// import ListSettingsService from "../SettingServices/ListSettingsService";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  status?: string[];
  date?: string;
  showAll?: string;
  userId: string;
  withUnreadMessages?: string;
  isNotAssignedUser?: string;
  queuesIds?: string[];
  includeNotQueueDefined?: string;
  whatsappId?: string;
  orderBy?: string;
  tenantId: string | number;
  profile: string;
}

interface Response {
  ticketsOpen: any[];
  ticketsPending: any[];
  ticketsClosed: any[];
  ticketsGroup: any[];
  countOpen: number;
  countPending: number;
  countClosed: number;
  countGroups: number;
  hasMoreOpen: boolean;
  hasMorePending: boolean;
  hasMoreClosed: boolean;
  hasMoreGroup: boolean;
}

const ListTicketsService = async ({
  searchParam = "",
  pageNumber = "1",
  status,
  date: _date,
  showAll,
  userId,
  withUnreadMessages,
  queuesIds,
  isNotAssignedUser,
  includeNotQueueDefined: _includeNotQueueDefined,
  whatsappId,
  orderBy = "recent",
  tenantId,
  profile
}: Request): Promise<Response> => {
  // check is admin or manager
  const isAdminShowAll = showAll == "true" && profile === "admin";
  const isManagerShowAll = showAll == "true" && profile === "manager";
  const isUnread =
    withUnreadMessages && withUnreadMessages == "true" ? "S" : "N";
  const isNotAssigned =
    isNotAssignedUser && isNotAssignedUser == "true" ? "S" : "N";
  const isShowAll = isAdminShowAll ? "S" : "N";
  const isManagerShow = isManagerShowAll ? "S" : "N";
  const isQueuesIds = queuesIds ? "S" : "N";

  const isSearchParam = searchParam ? "S" : "N";
  const isWhatsappId =
    whatsappId && whatsappId !== "null" && whatsappId !== "" ? "S" : "N";

  // Determinar ordenação
  let orderByClause = 't."updatedAt" desc'; // padrão: mais recentes

  if (orderBy === "priority") {
    // Prioridade: tickets com maior tempo sem resposta do usuário
    // Usar lastMessageAt para calcular tempo de espera
    orderByClause = 't."lastMessageAt" asc, t."updatedAt" asc';
  }

  // // tratar as configurações do sistema
  // const settings = await ListSettingsService(tenantId);
  // const isNotViewAssignedTickets =
  //   settings?.find(s => {
  //     return s.key === "NotViewAssignedTickets";
  //   })?.value === "enabled"
  //     ? "S"
  //     : "N";

  if (!status && !isAdminShowAll) {
    // if not informed status and not admin, reject request
    // status = ["open", "pending"];
    throw new AppError("ERR_NO_STATUS_SELECTED", 404);
  }

  if (isAdminShowAll) {
    status = ["open", "pending", "closed", "pending_evaluation"];
  }

  // Verificar se existem filas cadastradas, caso contrário,
  // não aplicar restrição
  const isExistsQueueTenant =
    (await Queue.count({
      where: { tenantId }
    })) > 0
      ? "S"
      : "N";
  // list queues user request
  const queues = await UsersQueues.findAll({
    where: {
      userId
    }
  });

  // list manager queues user request
  const managerQueues = await UserManagerQueues.findAll({
    where: {
      userId
    }
  });

  // mount array ids queues (user queues + manager queues)
  let queuesIdsUser = [
    ...queues.map(q => q.queueId),
    ...managerQueues.map(q => q.queueId)
  ];
  // check is queues filter and verify access user queue
  if (queuesIds && queuesIds.length > 0) {
    const newArray: number[] = [];
    queuesIds.forEach(i => {
      const idx = queuesIdsUser.indexOf(+i);
      if (idx !== -1) {
        newArray.push(+i);
      }
    });
    queuesIdsUser = newArray.length ? newArray : [0];
    /* console.log("🔍 [BACKEND] Filtro de filas aplicado:", {
      queuesIds,
      queuesIdsUser,
      newArray
    }); */
  } else {
    /* console.log(
      "🔍 [BACKEND] Sem filtro de filas, usando todas as filas do usuário:",
      queuesIdsUser
    ); */
  }
  // se não existir fila, ajustar para parse do sql
  if (!queuesIdsUser.length) {
    queuesIdsUser = [0];
  }

  //   const query = `
  //   select
  //   "Ticket" .*,
  //   "contact"."id" as "contact.id",
  //   "contact"."name" as "contact.name",
  //   "contact"."number" as "contact.number",
  //   "contact"."profilePicUrl" as "contact.profilePicUrl",
  //   "contact->extraInfo"."id" as "contact.extraInfo.id",
  //   "contact->extraInfo"."name" as "contact.extraInfo.name",
  //   "contact->extraInfo"."value" as "contact.extraInfo.value",
  //   "contact->extraInfo"."contactId" as "contact.extraInfo.contactId",
  //   "contact->extraInfo"."createdAt" as "contact.extraInfo.createdAt",
  //   "contact->extraInfo"."updatedAt" as "contact.extraInfo.updatedAt",
  //   "contact->tags"."id" as "contact.tags.id",
  //   "contact->tags"."tag" as "contact.tags.tag",
  //   "contact->tags"."color" as "contact.tags.color",
  //   "contact->tags"."isActive" as "contact.tags.isActive",
  //   "contact->tags"."userId" as "contact.tags.userId",
  //   "contact->tags"."tenantId" as "contact.tags.tenantId",
  //   "contact->tags"."createdAt" as "contact.tags.createdAt",
  //   "contact->tags"."updatedAt" as "contact.tags.updatedAt",
  //   "contact->tags->ContactTag"."id" as "contact.tags.ContactTag.id",
  //   "contact->tags->ContactTag"."contactId" as "contact.tags.ContactTag.contactId",
  //   "contact->tags->ContactTag"."tagId" as "contact.tags.ContactTag.tagId",
  //   "contact->tags->ContactTag"."tenantId" as "contact.tags.ContactTag.tenantId",
  //   "contact->tags->ContactTag"."createdAt" as "contact.tags.ContactTag.createdAt",
  //   "contact->tags->ContactTag"."updatedAt" as "contact.tags.ContactTag.updatedAt",
  //   "contact->wallets"."id" as "contact.wallets.id",
  //   "contact->wallets"."name" as "contact.wallets.name",
  //   "contact->wallets->ContactWallet"."id" as "contact.wallets.ContactWallet.id",
  //   "contact->wallets->ContactWallet"."contactId" as "contact.wallets.ContactWallet.contactId",
  //   "contact->wallets->ContactWallet"."walletId" as "contact.wallets.ContactWallet.walletId",
  //   "contact->wallets->ContactWallet"."tenantId" as "contact.wallets.ContactWallet.tenantId",
  //   "contact->wallets->ContactWallet"."createdAt" as "contact.wallets.ContactWallet.createdAt",
  //   "contact->wallets->ContactWallet"."updatedAt" as "contact.wallets.ContactWallet.updatedAt",
  //   "user"."id" as "user.id",
  //   "user"."name" as "user.name",
  //   "user"."profile" as "user.profile"
  //   from
  //   (
  //   select
  //   count(*) OVER ( ) as count,
  //   *
  //   from "Tickets" t
  //   where "tenantId" = :tenantId
  //   and t.status in ( :status )
  //   and (( :isShowAll = 'N' and  (
  //     (t."queueId" in ( :queuesIdsUser ))
  //     or t."userId" = :userId )
  //   ) OR (:isShowAll = 'S') )
  //   and (( :isUnread = 'S'  and t."unreadMessages" > 0) OR (:isUnread = 'N'))
  //   and ((:isNotAssigned = 'S' and t."userId" is null) OR (:isNotAssigned = 'N'))
  //   and ((:isSearchParam = 'S' and ( exists (
  //     select 1 from "Messages" m where m."ticketId" = t.id
  //     and upper(m.body) like upper(:searchParam)
  //     ) or (t.id::varchar like :searchParam) or (exists (select 1 from "Contacts" c where c.id = t."contactId" and upper(c."name") like upper(:searchParam)))) OR (:isSearchParam = 'N'))
  //   )
  //   --order by t."updatedAt" desc
  //   limit :limit offset :offset ) as "Ticket"
  //   left outer join "Contacts" as "contact" on
  //   "Ticket"."contactId" = "contact"."id"
  //   left outer join "ContactCustomFields" as "contact->extraInfo" on
  //   "contact"."id" = "contact->extraInfo"."contactId"
  //   left outer join ( "ContactTags" as "contact->tags->ContactTag"
  //   inner join "Tags" as "contact->tags" on
  //   "contact->tags"."id" = "contact->tags->ContactTag"."tagId") on
  //   "contact"."id" = "contact->tags->ContactTag"."contactId"
  //   left outer join ( "ContactWallets" as "contact->wallets->ContactWallet"
  //   inner join "Users" as "contact->wallets" on
  //   "contact->wallets"."id" = "contact->wallets->ContactWallet"."walletId") on
  //   "contact"."id" = "contact->wallets->ContactWallet"."contactId"
  //   left outer join "Users" as "user" on
  //   "Ticket"."userId" = "user"."id"
  //   order by
  //   "Ticket"."updatedAt" desc;
  // `;

  // Query base para todos os status - OTIMIZADA (excluindo grupos)
  const baseQuery = `
select
  count(*) OVER () as count,
  c."profilePicUrl",
  c."name",
  c."number",
  c."email",
  c."pushname",
  c."isUser",
  c."isWAContact",
  c."isGroup",
  c."isBlocked" as "contactIsBlocked",
  c."tenantId" as "contactTenantId",
  c."createdAt" as "contactCreatedAt",
  c."updatedAt" as "contactUpdatedAt",
  (
    select json_agg(
      jsonb_build_object(
        'id', tg.id, 
        'tag', tg.tag, 
        'color', tg.color,
        'isActive', tg."isActive"
      )
    )
    from "ContactTags" ct2
    left join "Tags" tg on tg.id = ct2."tagId" and tg."isActive" = true
    where ct2."contactId" = c.id
    limit 10
  ) as tags,
  u."name" as username,
  q.queue,
  jsonb_build_object('id', w.id, 'name', w."name") as whatsapp,
  t.*
from "Tickets" t
left join "Whatsapps" w on w.id = t."whatsappId"
left join "Contacts" c on t."contactId" = c.id
left join "Users" u on u.id = t."userId"
left join "Queues" q on q.id = t."queueId"
where t."tenantId" = :tenantId
  and c."tenantId" = :tenantId
  and t.status = :status
  and t."isGroup" = false
  and (
    (:isShowAll = 'N' and :isManagerShow = 'N' and (
      (:isExistsQueueTenant = 'S' and (
        (t."queueId" in (:queuesIdsUser) and (t."userId" is null or t."userId" = :userId))
        or (t."queueId" is null and (t."userId" is null or t."userId" = :userId))
      ))
      or (exists (
        select 1
        from "ContactWallets" cw
        where cw."walletId" = :userId
          and cw."contactId" = t."contactId"
      ) and t."userId" is null)
    )) 
    or (:isShowAll = 'S')
    or (:isManagerShow = 'S' and (t."queueId" in (:queuesIdsUser) or t."queueId" is null))
    or (:isExistsQueueTenant = 'N' and t."userId" = :userId)
  )
  and ((:isUnread = 'S' and t."unreadMessages" > 0) or (:isUnread = 'N'))
  and ((:isNotAssigned = 'S' and t."userId" is null) or (:isNotAssigned = 'N'))
  and (
    (:isSearchParam = 'S' and (
      t.id::varchar like :searchParam
      or exists (
        select 1 from "Contacts" c2
        where c2.id = t."contactId"
          and (upper(c2."name") like upper(:searchParam)
               or c2."number" like :searchParam)
      )
    )) or (:isSearchParam = 'N')
  )
  and ((:isWhatsappId = 'S' and (t."whatsappId" = :whatsappId OR t."whatsappId" IS NULL)) or (:isWhatsappId = 'N'))
order by ${orderByClause}
limit :limit offset :offset;
`;

  const limit = 30;
  const offset = limit * (+pageNumber - 1);

  // Parâmetros base para todas as queries
  const baseParams = {
    tenantId,
    isQueuesIds,
    isShowAll,
    isManagerShow,
    isExistsQueueTenant,
    queuesIdsUser,
    userId,
    isUnread,
    isNotAssigned,
    isSearchParam,
    searchParam: `%${searchParam}%`,
    isWhatsappId,
    whatsappId:
      whatsappId && whatsappId !== "null" && whatsappId !== ""
        ? parseInt(whatsappId, 10)
        : null,
    limit,
    offset
  };

  // console.log("🔍 [BACKEND] Executando queries separadas por status");
  // console.log("📋 Parâmetros base:", JSON.stringify(baseParams, null, 2));
  // console.log("👤 [BACKEND] userId:", userId);
  // console.log("🏢 [BACKEND] queuesIdsUser:", queuesIdsUser);
  // console.log("🔍 [BACKEND] queuesIds filtro:", queuesIds);
  // Query para contar tickets sem paginação (excluindo grupos)
  const countQuery = `
select
  count(*) as count
from "Tickets" t
left join "Whatsapps" w on w.id = t."whatsappId"
left join "Contacts" c on t."contactId" = c.id
left join "Users" u on u.id = t."userId"
left join "Queues" q on q.id = t."queueId"
where t."tenantId" = :tenantId
  and c."tenantId" = :tenantId
  and t.status = :status
  and t."isGroup" = false
  and (
    (:isShowAll = 'N' and :isManagerShow = 'N' and (
      (:isExistsQueueTenant = 'S' and (
        (t."queueId" in (:queuesIdsUser) and (t."userId" is null or t."userId" = :userId))
        or (t."queueId" is null and (t."userId" is null or t."userId" = :userId))
      ))
      or (exists (
        select 1
        from "ContactWallets" cw
        where cw."walletId" = :userId
          and cw."contactId" = t."contactId"
      ) and t."userId" is null)
    )) 
    or (:isShowAll = 'S')
    or (:isManagerShow = 'S' and (t."queueId" in (:queuesIdsUser) or t."queueId" is null))
    or (:isExistsQueueTenant = 'N' and t."userId" = :userId)
  )
  and ((:isUnread = 'S' and t."unreadMessages" > 0) or (:isUnread = 'N'))
  and ((:isNotAssigned = 'S' and t."userId" is null) or (:isNotAssigned = 'N'))
  and (
    (:isSearchParam = 'S' and (
      t.id::varchar like :searchParam
      or exists (
        select 1 from "Contacts" c2
        where c2.id = t."contactId"
          and (upper(c2."name") like upper(:searchParam)
               or c2."number" like :searchParam)
      )
    )) or (:isSearchParam = 'N')
  )
  and ((:isWhatsappId = 'S' and (t."whatsappId" = :whatsappId OR t."whatsappId" IS NULL)) or (:isWhatsappId = 'N'));
`;

  // Query específica para buscar tickets de grupos (com paginação e filtros)
  const groupQuery = `
select
  count(*) OVER () as count,
  c."profilePicUrl",
  c."name",
  c."number",
  c."email",
  c."pushname",
  c."isUser",
  c."isWAContact",
  c."isGroup",
  c."isBlocked" as "contactIsBlocked",
  c."tenantId" as "contactTenantId",
  c."createdAt" as "contactCreatedAt",
  c."updatedAt" as "contactUpdatedAt",
  (
    select json_agg(
      jsonb_build_object(
        'id', tg.id, 
        'tag', tg.tag, 
        'color', tg.color,
        'isActive', tg."isActive"
      )
    )
    from "ContactTags" ct2
    left join "Tags" tg on tg.id = ct2."tagId" and tg."isActive" = true
    where ct2."contactId" = c.id
    limit 10
  ) as tags,
  u."name" as username,
  q.queue,
  jsonb_build_object('id', w.id, 'name', w."name") as whatsapp,
  t.*
from "Tickets" t
left join "Whatsapps" w on w.id = t."whatsappId"
left join "Contacts" c on t."contactId" = c.id
left join "Users" u on u.id = t."userId"
left join "Queues" q on q.id = t."queueId"
where t."tenantId" = :tenantId
  and c."tenantId" = :tenantId
  and t.status in ('open', 'pending', 'closed')
  and t."isGroup" = true
  and (
    (:isShowAll = 'N' and :isManagerShow = 'N' and (
      (:isExistsQueueTenant = 'S' and (
        (t."queueId" in (:queuesIdsUser) and (t."userId" is null or t."userId" = :userId))
        or (t."queueId" is null and (t."userId" is null or t."userId" = :userId))
      ))
      or (exists (
        select 1
        from "ContactWallets" cw
        where cw."walletId" = :userId
          and cw."contactId" = t."contactId"
      ) and t."userId" is null)
    )) 
    or (:isShowAll = 'S')
    or (:isManagerShow = 'S' and (t."queueId" in (:queuesIdsUser) or t."queueId" is null))
    or (:isExistsQueueTenant = 'N' and t."userId" = :userId)
  )
  and ((:isUnread = 'S' and t."unreadMessages" > 0) or (:isUnread = 'N'))
  and ((:isNotAssigned = 'S' and t."userId" is null) or (:isNotAssigned = 'N'))
  and (
    (:isSearchParam = 'S' and (
      t.id::varchar like :searchParam
      or exists (
        select 1 from "Contacts" c2
        where c2.id = t."contactId"
          and (upper(c2."name") like upper(:searchParam)
               or c2."number" like :searchParam)
      )
    )) or (:isSearchParam = 'N')
  )
  and ((:isWhatsappId = 'S' and (t."whatsappId" = :whatsappId OR t."whatsappId" IS NULL)) or (:isWhatsappId = 'N'))
order by ${orderByClause}
limit :limit offset :offset;
`;

  // Query de contagem para grupos
  const countGroupQuery = `
select
  count(*) as count
from "Tickets" t
left join "Whatsapps" w on w.id = t."whatsappId"
left join "Contacts" c on t."contactId" = c.id
left join "Users" u on u.id = t."userId"
left join "Queues" q on q.id = t."queueId"
where t."tenantId" = :tenantId
  and c."tenantId" = :tenantId
  and t.status in ('open', 'pending', 'closed')
  and t."isGroup" = true
  and (
    (:isShowAll = 'N' and :isManagerShow = 'N' and (
      (:isExistsQueueTenant = 'S' and (
        (t."queueId" in (:queuesIdsUser) and (t."userId" is null or t."userId" = :userId))
        or (t."queueId" is null and (t."userId" is null or t."userId" = :userId))
      ))
      or (exists (
        select 1
        from "ContactWallets" cw
        where cw."walletId" = :userId
          and cw."contactId" = t."contactId"
      ) and t."userId" is null)
    )) 
    or (:isShowAll = 'S')
    or (:isManagerShow = 'S' and (t."queueId" in (:queuesIdsUser) or t."queueId" is null))
    or (:isExistsQueueTenant = 'N' and t."userId" = :userId)
  )
  and ((:isUnread = 'S' and t."unreadMessages" > 0) or (:isUnread = 'N'))
  and ((:isNotAssigned = 'S' and t."userId" is null) or (:isNotAssigned = 'N'))
  and (
    (:isSearchParam = 'S' and (
      t.id::varchar like :searchParam
      or exists (
        select 1 from "Contacts" c2
        where c2.id = t."contactId"
          and (upper(c2."name") like upper(:searchParam)
               or c2."number" like :searchParam)
      )
    )) or (:isSearchParam = 'N')
  )
  and ((:isWhatsappId = 'S' and (t."whatsappId" = :whatsappId OR t."whatsappId" IS NULL)) or (:isWhatsappId = 'N'));
`;

  // Query específica para contar grupos (versão simplificada)
  const countGroupsQuery = `
select
  count(*) as count
from "Tickets" t
where t."tenantId" = :tenantId
  and t."isGroup" = true
  and (t."userId" = :userId OR t."userId" IS NULL)
  and t.status in ('open', 'pending', 'closed', 'pending_evaluation')
`;

  // Executar queries apenas para os status solicitados
  const statusToQuery = status || ["open", "pending", "closed"];

  // Função auxiliar para executar query se status estiver incluído
  const executeQueryIfStatus = async (statusName: string) => {
    if (statusName === "group") {
      return Ticket.sequelize?.query(groupQuery, {
        replacements: { ...baseParams },
        type: QueryTypes.SELECT,
        nest: true
      });
    }
    if (statusToQuery.includes(statusName)) {
      return Ticket.sequelize?.query(baseQuery, {
        replacements: { ...baseParams, status: statusName },
        type: QueryTypes.SELECT,
        nest: true
      });
    }
    return [];
  };

  const executeCountIfStatus = async (statusName: string) => {
    if (statusName === "group") {
      return Ticket.sequelize?.query(countGroupQuery, {
        replacements: { ...baseParams },
        type: QueryTypes.SELECT,
        nest: true
      });
    }
    if (statusToQuery.includes(statusName)) {
      return Ticket.sequelize?.query(countQuery, {
        replacements: { ...baseParams, status: statusName },
        type: QueryTypes.SELECT,
        nest: true
      });
    }
    return [{ count: 0 }];
  };

  // 🔍 DEBUG: Log dos parâmetros para contagem de grupos
  console.log("🔍 [BACKEND] Executando contagem de grupos com parâmetros:", {
    tenantId,
    userId,
    isSearchParam,
    searchParam,
    isWhatsappId,
    whatsappId
  });

  // 🔍 DEBUG: Log da query de grupos
  console.log("🔍 [BACKEND] Query de grupos:", countGroupsQuery);

  console.log("🔍 [BACKEND] Executando queries em Promise.all");

  const [
    ticketsOpen,
    ticketsPending,
    ticketsClosed,
    ticketsGroup,
    countOpen,
    countPending,
    countClosed,
    countGroup,
    countGroups
  ] = await Promise.all([
    executeQueryIfStatus("open"),
    executeQueryIfStatus("pending"),
    executeQueryIfStatus("closed"),
    executeQueryIfStatus("group"),
    executeCountIfStatus("open"),
    executeCountIfStatus("pending"),
    executeCountIfStatus("closed"),
    executeCountIfStatus("group"),
    // Executar contagem de grupos simplificada (para backward compatibility)
    Ticket.sequelize?.query(countGroupsQuery, {
      replacements: baseParams,
      type: QueryTypes.SELECT,
      nest: true
    })
  ]);

  console.log("🔍 [BACKEND] Queries executadas. Resultados brutos:");
  console.log("ticketsGroup:", ticketsGroup);
  console.log("countGroup:", countGroup);

  // 🔍 DEBUG: Log do resultado da contagem de grupos
  console.log("🔍 [BACKEND] Resultado da contagem de grupos:", countGroups);

  // Processar resultados
  const processTickets = (
    tickets: any[] | undefined,
    totalCount: number,
    _statusName: string
  ) => {
    let ticketsLength = 0;
    if (tickets?.length) {
      ticketsLength = tickets.length;
    }
    const hasMore = totalCount > offset + ticketsLength;

    /* Log dos tickets retornados para debug
     console.log(
      `📊 [BACKEND] Tickets ${statusName} retornados:`,
      tickets?.map(t => ({
        id: t.id,
        userId: t.userId,
        queueId: t.queueId,
        status: t.status,
        contactName: t.name
      }))
  ); */

    return {
      count: totalCount,
      ticketsLength,
      hasMore,
      tickets: tickets || []
    };
  };

  const openResult = processTickets(
    ticketsOpen,
    (countOpen as any)?.[0]?.count || 0,
    "OPEN"
  );
  const pendingResult = processTickets(
    ticketsPending,
    (countPending as any)?.[0]?.count || 0,
    "PENDING"
  );
  const closedResult = processTickets(
    ticketsClosed,
    (countClosed as any)?.[0]?.count || 0,
    "CLOSED"
  );
  console.log("🔍 [BACKEND] Processando resultados de grupos:");
  console.log("ticketsGroup recebido:", ticketsGroup);
  console.log("countGroup recebido:", countGroup);

  const groupResult = processTickets(
    ticketsGroup,
    (countGroup as any)?.[0]?.count || 0,
    "GROUP"
  );

  console.log("🔍 [BACKEND] groupResult após processamento:", {
    count: groupResult.count,
    ticketsLength: groupResult.ticketsLength,
    hasMore: groupResult.hasMore,
    firstTicket: groupResult.tickets[0] || null
  });

  // // 🔍 DEBUG: Log dos resultados
  // console.log("📊 [BACKEND] Resultados das queries:");
  // console.log(
  //   "📊 OPEN - count:",
  //   openResult.count,
  //   "tickets:",
  //   openResult.ticketsLength,
  //   "hasMore:",
  //   openResult.hasMore
  // );
  // console.log(
  //   "📊 PENDING - count:",
  //   pendingResult.count,
  //   "tickets:",
  //   pendingResult.ticketsLength,
  //   "hasMore:",
  //   pendingResult.hasMore
  // );
  // console.log(
  //   "📊 CLOSED - count:",
  //   closedResult.count,
  //   "tickets:",
  //   closedResult.ticketsLength,
  //   "hasMore:",
  //   closedResult.hasMore
  // );

  // 🔍 DEBUG: Log dos resultados finais
  console.log("📊 [BACKEND] Resultados finais:", {
    ticketsOpen: openResult.tickets.length,
    ticketsPending: pendingResult.tickets.length,
    ticketsClosed: closedResult.tickets.length,
    ticketsGroup: groupResult.tickets.length,
    countOpen: openResult.count,
    countPending: pendingResult.count,
    countClosed: closedResult.count,
    countGroups: groupResult.count,
    hasMoreGroup: groupResult.hasMore
  });

  return {
    ticketsOpen: openResult.tickets,
    ticketsPending: pendingResult.tickets,
    ticketsClosed: closedResult.tickets,
    ticketsGroup: groupResult.tickets,
    countOpen: openResult.count,
    countPending: pendingResult.count,
    countClosed: closedResult.count,
    countGroups: groupResult.count,
    hasMoreOpen: openResult.hasMore,
    hasMorePending: pendingResult.hasMore,
    hasMoreClosed: closedResult.hasMore,
    hasMoreGroup: groupResult.hasMore
  };
};

export default ListTicketsService;
