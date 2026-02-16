import { Application } from "express";
import database from "./database";
import modules from "./modules";
import express from "./express";
import bullMQ from "./bull";
import waitForPostgresConnection from "./awaitPostgresConnection";
import FixManagerDepartmentMembership from "../services/UserServices/FixManagerDepartmentMembership";

export default async function bootstrap(app: Application): Promise<void> {
  await waitForPostgresConnection();
  await express(app);
  await database(app);

  // Verificar e corrigir consistência de gerentes e departamentos
  await FixManagerDepartmentMembership();

  await modules(app);
  await bullMQ(app); // precisar subir na instancia dos bots
}
