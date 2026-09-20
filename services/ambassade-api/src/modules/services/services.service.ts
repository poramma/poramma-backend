// Logique métier déplacée dans @poramma/ambassade-core (partagée avec
// communaute-api) — ce fichier ne fait plus que lier le pool de connexion
// local d'ambassade-api aux fonctions du package.
import { db } from "../../db/connection";
import { servicesLogic } from "@poramma/ambassade-core";

export const listServices = () => servicesLogic.listServices(db);
export const getService = (id: string) => servicesLogic.getService(db, id);
export const createService = (data: Parameters<typeof servicesLogic.createService>[1]) => servicesLogic.createService(db, data);
export const updateService = (id: string, data: Parameters<typeof servicesLogic.updateService>[2]) =>
  servicesLogic.updateService(db, id, data);
export const deleteService = (id: string) => servicesLogic.deleteService(db, id);
export const getSubService = (id: string) => servicesLogic.getSubService(db, id);
export const createSubService = (data: Parameters<typeof servicesLogic.createSubService>[1]) =>
  servicesLogic.createSubService(db, data);
export const updateSubService = (id: string, data: Parameters<typeof servicesLogic.updateSubService>[2]) =>
  servicesLogic.updateSubService(db, id, data);
export const createSchedule = (subServiceId: string, data: Parameters<typeof servicesLogic.createSchedule>[2]) =>
  servicesLogic.createSchedule(db, subServiceId, data);
export const updateSchedule = (id: string, data: Parameters<typeof servicesLogic.updateSchedule>[2]) =>
  servicesLogic.updateSchedule(db, id, data);
export const deleteSchedule = (id: string) => servicesLogic.deleteSchedule(db, id);
export const createException = (
  subServiceId: string,
  data: Parameters<typeof servicesLogic.createException>[2],
  createdBy: string
) => servicesLogic.createException(db, subServiceId, data, createdBy);
export const deleteException = (id: string) => servicesLogic.deleteException(db, id);
export const addRequirement = (subServiceId: string, data: Parameters<typeof servicesLogic.addRequirement>[2]) =>
  servicesLogic.addRequirement(db, subServiceId, data);
export const updateRequirement = (id: string, data: Parameters<typeof servicesLogic.updateRequirement>[2]) =>
  servicesLogic.updateRequirement(db, id, data);
export const removeRequirement = (id: string) => servicesLogic.removeRequirement(db, id);
