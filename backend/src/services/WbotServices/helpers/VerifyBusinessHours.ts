import type { IBaileysMessageAdapter, MessageLikeMinimal } from "../../../types/baileysAdapter";
import { fromUnixTime, parse, isWithinInterval, isSameDay } from "date-fns";
import Ticket from "../../../models/Ticket";
import ShowBusinessHoursAndMessageService from "../../TenantServices/ShowBusinessHoursAndMessageService";
import CreateMessageSystemService from "../../MessageServices/CreateMessageSystemService";

const verifyBusinessHours = async (
  msg: IBaileysMessageAdapter | MessageLikeMinimal,
  ticket: Ticket
): Promise<boolean> => {
  let isBusinessHours = true;

  if (ticket.status !== "closed" && !msg.fromMe && !ticket.isGroup) {
    const tenant = await ShowBusinessHoursAndMessageService({
      tenantId: ticket.tenantId
    });

    const dateMsg = fromUnixTime(msg.timestamp ?? Math.floor(Date.now() / 1000));
    const businessDay: any = tenant.businessHours?.find(
      (d: any) => d.day === dateMsg.getDay()
    );

    if (!businessDay) return isBusinessHours;
    if (businessDay.type === "O") return isBusinessHours;

    const isHoursFistInterval = isWithinInterval(dateMsg, {
      start: parse(businessDay.hr1, "HH:mm", new Date()),
      end: parse(businessDay.hr2, "HH:mm", new Date())
    });
    const isHoursLastInterval = isWithinInterval(dateMsg, {
      start: parse(businessDay.hr3, "HH:mm", new Date()),
      end: parse(businessDay.hr4, "HH:mm", new Date())
    });

    if (
      businessDay.type === "C" ||
      (!isHoursFistInterval && !isHoursLastInterval)
    ) {
      isBusinessHours = false;
      let shouldSendMessage = true;

      if (ticket.lastBusinessHourMessageAt) {
        const lastMessageDate = new Date(ticket.lastBusinessHourMessageAt);
        const currentDate = dateMsg;
        if (isSameDay(lastMessageDate, currentDate)) {
          const wasInFirstInterval = isWithinInterval(lastMessageDate, {
            start: parse(businessDay.hr1, "HH:mm", new Date()),
            end: parse(businessDay.hr2, "HH:mm", new Date())
          });
          const wasInLastInterval = isWithinInterval(lastMessageDate, {
            start: parse(businessDay.hr3, "HH:mm", new Date()),
            end: parse(businessDay.hr4, "HH:mm", new Date())
          });
          if (!wasInFirstInterval && !wasInLastInterval) {
            shouldSendMessage = false;
          }
        }
      }

      if (shouldSendMessage) {
        const messageData = {
          body: tenant.messageBusinessHours,
          fromMe: true,
          read: true,
          sendType: "bot",
          tenantId: ticket.tenantId
        };
        await CreateMessageSystemService({
          msg: messageData,
          tenantId: ticket.tenantId,
          ticket,
          sendType: messageData.sendType,
          status: "pending"
        });
        await ticket.update({
          lastBusinessHourMessageAt: dateMsg
        });
      }
    }
  }
  return isBusinessHours;
};

export default verifyBusinessHours;
