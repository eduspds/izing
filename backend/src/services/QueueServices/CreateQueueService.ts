// import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";

interface Request {
  queue: string;
  isActive: boolean;
  isConfidential?: boolean;
  userId: number;
  tenantId: number | string;
}

const CreateQueueService = async ({
  queue,
  isActive,
  isConfidential = false,
  userId,
  tenantId
}: Request): Promise<Queue> => {
  const queueData = await Queue.create({
    queue,
    isActive,
    isConfidential,
    userId,
    tenantId
  });

  return queueData;
};

export default CreateQueueService;
