/* eslint-disable no-restricted-syntax */
import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  Default,
  BelongsTo,
  ForeignKey,
  AutoIncrement,
  AllowNull
} from "sequelize-typescript";
import User from "./User";
import Tenant from "./Tenant";

@Table({ freezeTableName: true })
class ChatFlow extends Model<ChatFlow> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: string;

  @Column(DataType.TEXT)
  name: string;

  @Default({})
  @AllowNull
  @Column(DataType.JSON)
  get flow(): any {
    const flow = this.getDataValue("flow");
    if (flow) {
      // Validar se nodeList existe e é um array
      if (flow.nodeList && Array.isArray(flow.nodeList)) {
        for (const node of flow.nodeList) {
          if (node.type === "node") {
            // Validar se interactions existe e é um array
            if (node.interactions && Array.isArray(node.interactions)) {
              for (const item of node.interactions) {
                if (item.type === "MediaField" && item.data && item.data.mediaUrl) {
                  const { BACKEND_URL, PROXY_PORT } = process.env;
                  const file = item.data.mediaUrl;
                  item.data.fileName = file;
                  
                  if (!BACKEND_URL) {
                    item.data.mediaUrl = `/public/${file}`;
                  } else {
                    const baseUrl = BACKEND_URL.includes(":")
                      ? BACKEND_URL
                      : `${BACKEND_URL}:${PROXY_PORT || ""}`;
                    item.data.mediaUrl = `${baseUrl}/public/${file}`;
                  }
                }
              }
            }
          }
        }
      }
      return flow;
    }
    return {};
  }

  @Default(true)
  @Column
  isActive: boolean;

  @Default(false)
  @Column
  isDeleted: boolean;

  @Default(null)
  @Column(DataType.TEXT)
  celularTeste: string;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Tenant)
  @Column
  tenantId: number;

  @BelongsTo(() => Tenant)
  tenant: Tenant;

  @CreatedAt
  @Column(DataType.DATE(6))
  createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE(6))
  updatedAt: Date;

  tableName: "ChatFlow";
}

export default ChatFlow;
