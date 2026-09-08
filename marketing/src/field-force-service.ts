import { defaultFieldDevicePolicy, FIELD_DEVICE_PERMISSIONS } from "./field-force-policy";
import type { DevicePermission, FieldEmployee } from "./field-force";

export interface PermissionState {
  permission: DevicePermission;
  granted: boolean;
  checkedAt: string;
}

export interface DeviceRegistration {
  deviceId: string;
  employeeId: string;
  registeredAt: string;
  policy: ReturnType<typeof defaultFieldDevicePolicy>;
  permissions: PermissionState[];
}

export class FieldForceService {
  createDeviceRegistration(employee: FieldEmployee, deviceId: string, granted: DevicePermission[]): DeviceRegistration {
    const now = new Date().toISOString();
    const policy = defaultFieldDevicePolicy();

    return {
      deviceId,
      employeeId: employee.employeeId,
      registeredAt: now,
      policy,
      permissions: FIELD_DEVICE_PERMISSIONS.map((definition) => ({
        permission: definition.permission,
        granted: granted.includes(definition.permission),
        checkedAt: now,
      })),
    };
  }

  canTrackWorkLocation(registration: DeviceRegistration): boolean {
    return registration.policy.locationTrackingEnabled &&
      registration.policy.requiredPermissions.includes("location") &&
      registration.permissions.some((item) => item.permission === "location" && item.granted);
  }
}
