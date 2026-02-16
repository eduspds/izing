/* eslint-disable @typescript-eslint/no-explicit-any */
import CheckExpiredEvaluationsService from "../services/ChatFlowServices/CheckExpiredEvaluationsService";
import { logger } from "../utils/logger";

export default {
  key: "CheckExpiredEvaluations",
  options: {
    // attempts: 0,
    removeOnComplete: false,
    removeOnFail: false,
    jobId: "CheckExpiredEvaluations",
    repeat: {
      every: 5 * 60 * 1000 // Executar a cada 5 minutos
    }
  },
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async handle() {
    try {
      logger.info("CheckExpiredEvaluations Initiated");
      await CheckExpiredEvaluationsService();
      logger.info("Finalized CheckExpiredEvaluations");
    } catch (error) {
      logger.error({ message: "Error checking expired evaluations", error });
      throw new Error(error);
    }
  }
};

