// Les tables "services" (services/sub_services/service_schedules/
// service_exceptions/requirements) vivent maintenant dans @poramma/ambassade-core
// — lues et écrites aussi bien par ambassade-api (staff, migrations) que par
// communaute-api (lecture publique). Ce fichier ne fait plus que ré-exporter
// pour ne pas casser les imports existants (`from "./schema.ambassade"`)
// dans les autres modules/schémas de ce service.
import { servicesSchema } from "@poramma/ambassade-core";

export const ambassade = servicesSchema.ambassade;
export const services = servicesSchema.services;
export const subServices = servicesSchema.subServices;
export const serviceSchedules = servicesSchema.serviceSchedules;
export const serviceExceptions = servicesSchema.serviceExceptions;
export const requirements = servicesSchema.requirements;
