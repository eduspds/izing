import { Sequelize, Op, QueryTypes } from "sequelize";
import Contact from "../../models/Contact";
import { logger } from "../../utils/logger";
import sequelize from "../../database";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  tenantId: string | number;
  profile: string;
  userId: string | number;
}

interface Response {
  contacts: Contact[];
  count: number;
  hasMore: boolean;
}

const ListContactsService = async ({
  searchParam = "",
  pageNumber = "1",
  tenantId,
  profile,
  userId
}: Request): Promise<Response> => {
  const limit = 40;
  const offset = limit * (+pageNumber - 1);

  const where = `
    "Contact"."tenantId" = ${tenantId}
    and (LOWER("Contact"."name") like '%${searchParam.toLowerCase().trim()}%'
        or "Contact"."number" like '%${searchParam.toLowerCase().trim()}%')
    and (('${profile}' = 'admin') or (("cw"."walletId" = ${userId}) or ("cw"."walletId" is null)))
  `;

  const queryCount = `
    select count(distinct "Contact"."id")
    from "Contacts" as "Contact"
    left join "ContactWallets" cw on cw."contactId" = "Contact".id
    where ${where}
  `;

  const query = `
    select
      "Contact"."id",
      "Contact"."name",
      "Contact"."number",
      "Contact"."email",
      "Contact"."profilePicUrl",
      "Contact"."pushname",
      "Contact"."telegramId",
      "Contact"."messengerId",
      "Contact"."instagramPK",
      "Contact"."isUser",
      "Contact"."isWAContact",
      "Contact"."isGroup",
      "Contact"."isBlocked",
      "Contact"."tenantId",
      "Contact"."createdAt",
      "Contact"."updatedAt",
      array_agg(
        case 
          when cw."walletId" is not null then json_build_object('id', cw."walletId", 'name', u."name")
          else null
        end
      ) filter (where cw."walletId" is not null) as "wallets"
    from
      "Contacts" as "Contact"
    left join "ContactWallets" cw on cw."contactId" = "Contact".id
    left join "Users" u on cw."walletId" = u."id"
    where ${where}
    group by 
      "Contact"."id",
      "Contact"."name",
      "Contact"."number",
      "Contact"."email",
      "Contact"."profilePicUrl",
      "Contact"."pushname",
      "Contact"."telegramId",
      "Contact"."messengerId",
      "Contact"."instagramPK",
      "Contact"."isUser",
      "Contact"."isWAContact",
      "Contact"."isGroup",
      "Contact"."isBlocked",
      "Contact"."tenantId",
      "Contact"."createdAt",
      "Contact"."updatedAt"
    order by "Contact"."name" asc
    limit ${limit} offset ${offset}
  `;

  const contacts: Contact[] = await sequelize.query(query, {
    type: QueryTypes.SELECT
  });

  const data: any = await sequelize.query(queryCount, {
    type: QueryTypes.SELECT
  });

  const count = (data && data[0]?.count) || 0;
  const hasMore = count > offset + contacts.length;

  return {
    contacts,
    count,
    hasMore
  };
};

export default ListContactsService;
