import type { DevicePermission, ManagedDevicePolicy } from "./field-force";

export interface PermissionDefinition {
  permission: DevicePermission;
  purpose: string;
  required: boolean;
  platformManaged: boolean;
}

export const FIELD_DEVICE_PERMISSIONS: PermissionDefinition[] = [
  {
    permission: "location",
    purpose: "Work visits, territory activity and field check-ins.",
    required: true,
    platformManaged: true,
  },
  {
    permission: "camera",
    purpose: "Client visit proof and approved business media capture.",
    required: false,
    platformManaged: true,
  },
  {
    permission: "notifications",
    purpose: "Tasks, visit reminders and security alerts.",
    required: true,
    platformManaged: true,
  },
  {
    permission: "phone",
    purpose: "Only where an approved calling workflow needs it.",
    required: false,
    platformManaged: true,
  },
  {
    permission: "storage",
    purpose: "Only where the operating system requires storage access for an approved feature.",
    required: false,
    platformManaged: true,
  },
  {
    permission: "device-management",
    purpose: "Company-device security policies such as managed configuration, lock and wipe where supported.",
    required: true,
    platformManaged: true,
  },
];

export function defaultFieldDevicePolicy(): ManagedDevicePolicy {
  return {
    companyOwned: true,
    companySim: true,
    requiredPermissions: FIELD_DEVICE_PERMISSIONS.filter((item) => item.required).map(
      (item) => item.permission,
    ),
    locationTrackingEnabled: true,
    workHoursOnly: true,
    personalDataMinimization: true,
    auditLogging: true,
  };
}
