export type DevicePermission =
  | "location"
  | "camera"
  | "notifications"
  | "phone"
  | "storage"
  | "device-management";

export type FieldEmployeeStatus = "active" | "inactive" | "on_leave" | "suspended";

export interface ManagedDevicePolicy {
  companyOwned: true;
  companySim: boolean;
  requiredPermissions: DevicePermission[];
  employeeAcknowledgedAt?: string;
  locationTrackingEnabled: boolean;
  workHoursOnly: boolean;
  personalDataMinimization: true;
  auditLogging: true;
}

export interface FieldEmployee {
  employeeId: string;
  displayName: string;
  role: string;
  territory?: string;
  status: FieldEmployeeStatus;
  managedDeviceId?: string;
  policy?: ManagedDevicePolicy;
}

export interface FieldVisit {
  employeeId: string;
  clientId: string;
  checkedInAt: string;
  checkedOutAt?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface DeviceSecurityEvent {
  deviceId: string;
  employeeId: string;
  event: "permission_changed" | "policy_violation" | "device_locked" | "device_wiped" | "security_alert";
  occurredAt: string;
  details: string;
}
