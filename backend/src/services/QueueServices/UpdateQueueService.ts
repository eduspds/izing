import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";

interface QueueData {
  queue: string;
  isActive: boolean;
  isConfidential?: boolean;
  userId: number;
  tenantId: number | string;
}

interface Request {
  queueData: QueueData;
  queueId: string;
}

const UpdateQueueService = async ({
  queueData,
  queueId
}: Request): Promise<Queue> => {
  const { queue, isActive, isConfidential, userId, tenantId } = queueData;

  const queueModel = await Queue.findOne({
    where: { id: queueId, tenantId },
    attributes: ["id", "queue", "isActive", "isConfidential", "userId"]
  });

  if (!queueModel) {
    throw new AppError("ERR_NO_QUEUE_FOUND", 404);
  }

  await queueModel.update({
    queue,
    isActive,
    isConfidential: isConfidential !== undefined ? isConfidential : false,
    userId
  });

  await queueModel.reload({
    attributes: ["id", "queue", "isActive", "isConfidential", "userId"]
  });

  return queueModel;
};

export default UpdateQueueService;
