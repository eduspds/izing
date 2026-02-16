import { Request, Response } from "express";
import CreateGroupService from "../services/InternalChatServices/CreateGroupService";
import AddGroupMemberService from "../services/InternalChatServices/AddGroupMemberService";
import RemoveGroupMemberService from "../services/InternalChatServices/RemoveGroupMemberService";
import ListUserGroupsService from "../services/InternalChatServices/ListUserGroupsService";
import UpdateGroupService from "../services/InternalChatServices/UpdateGroupService";

export const createGroup = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { name, description, memberIds, department, allowedProfile } = req.body;
  const { tenantId, id: userId } = req.user;

  try {
    const { group, members } = await CreateGroupService({
      name,
      description,
      creatorId: Number(userId),
      memberIds,
      tenantId: Number(tenantId),
      department,
      allowedProfile
    });

    return res.status(201).json({
      group,
      members
    });
  } catch (error) {
    console.error("Erro ao criar grupo:", error);
    return res.status(400).json({ error: error.message });
  }
};

export const listUserGroups = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { tenantId, id: userId } = req.user;

  try {
    const groups = await ListUserGroupsService({
      userId: Number(userId),
      tenantId: Number(tenantId)
    });

    return res.status(200).json(groups);
  } catch (error) {
    console.error("Erro ao listar grupos:", error);
    return res.status(400).json({ error: error.message });
  }
};

export const addGroupMember = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { groupId } = req.params;
  const { memberIds } = req.body;
  const { tenantId, id: userId } = req.user;

  try {
    const members = await AddGroupMemberService({
      groupId: parseInt(groupId),
      userId: Number(userId),
      newMemberIds: memberIds,
      tenantId: Number(tenantId)
    });

    return res.status(200).json({
      message: "Membros adicionados com sucesso",
      members
    });
  } catch (error) {
    console.error("Erro ao adicionar membro:", error);
    return res.status(400).json({ error: error.message });
  }
};

export const removeGroupMember = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { groupId, memberId } = req.params;
  const { tenantId, id: userId } = req.user;

  try {
    await RemoveGroupMemberService({
      groupId: parseInt(groupId),
      userId: Number(userId),
      memberIdToRemove: parseInt(memberId),
      tenantId: Number(tenantId)
    });

    return res.status(200).json({
      message: "Membro removido com sucesso"
    });
  } catch (error) {
    console.error("Erro ao remover membro:", error);
    return res.status(400).json({ error: error.message });
  }
};

export const leaveGroup = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { groupId } = req.params;
  const { tenantId, id: userId } = req.user;

  try {
    await RemoveGroupMemberService({
      groupId: parseInt(groupId),
      userId: Number(userId),
      memberIdToRemove: Number(userId), // Sair do próprio grupo
      tenantId: Number(tenantId)
    });

    return res.status(200).json({
      message: "Você saiu do grupo"
    });
  } catch (error) {
    console.error("Erro ao sair do grupo:", error);
    return res.status(400).json({ error: error.message });
  }
};

export const updateGroup = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { groupId } = req.params;
  const { name, description, department, allowedProfile } = req.body;
  const { tenantId, id: userId } = req.user;

  console.log("📝 BACKEND: Atualizando grupo:", {
    groupId,
    name,
    description,
    department,
    allowedProfile,
    userId,
    tenantId
  });

  try {
    const group = await UpdateGroupService({
      groupId: Number(groupId),
      userId: Number(userId),
      name,
      description,
      department,
      allowedProfile,
      tenantId: Number(tenantId)
    });

    console.log("📝 BACKEND: Grupo atualizado com sucesso:", {
      id: group.id,
      name: group.name,
      department: group.department,
      allowedProfile: group.allowedProfile
    });

    return res.status(200).json({
      group
    });
  } catch (error) {
    console.error("❌ BACKEND: Erro ao atualizar grupo:", error);
    return res.status(400).json({ error: error.message });
  }
};