import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  AutoIncrement
} from "sequelize-typescript";
import Tags from "./Tag";
import Queue from "./Queue";

@Table({ freezeTableName: true })
class TagQueues extends Model<TagQueues> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Tags)
  @Column
  tagId: number;

  @BelongsTo(() => Tags)
  tag: Tags;

  @ForeignKey(() => Queue)
  @Column
  queueId: number;

  @BelongsTo(() => Queue)
  queue: Queue;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  tableName: "TagQueues";
}

export default TagQueues;

