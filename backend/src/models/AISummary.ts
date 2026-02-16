import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  Index
} from 'sequelize-typescript';

@Table({
  tableName: 'ai_summaries',
  timestamps: true,
  paranoid: false
})
@Index(['ticketId', 'tenantId'])
class AISummary extends Model<AISummary> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true
  })
  id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'ticket_id'
  })
  ticketId: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'tenant_id'
  })
  tenantId: number;

  @Column({
    type: DataType.TEXT,
    allowNull: false
  })
  text: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'message_count'
  })
  messageCount: number;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
    defaultValue: 'gemini-1.5-flash'
  })
  model: string;

  @CreatedAt
  @Column({
    type: DataType.DATE,
    field: 'created_at'
  })
  createdAt: Date;

  @UpdatedAt
  @Column({
    type: DataType.DATE,
    field: 'updated_at'
  })
  updatedAt: Date;
}

export default AISummary;


