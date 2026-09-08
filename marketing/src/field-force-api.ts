import type { DevicePermission, FieldEmployee, FieldVisit } from "./field-force";
import { FieldForceService, type DeviceRegistration, type PermissionState } from "./field-force-service";

export interface RegisterDeviceRequest {
  employee: FieldEmployee;
  deviceId: string;
  grantedPermissions: DevicePermission[];
}

export interface CheckInRequest {
  employeeId: string;
  clientId: string;
  latitude?: number;
  longitude?: number;
  checkedInAt?: string;
}

export class FieldForceApi {
  private readonly service = new FieldForceService();
  private readonly devices = new Map<string, DeviceRegistration>();
  private readonly visits = new Map<string, FieldVisit>();

  registerDevice(request: RegisterDeviceRequest): DeviceRegistration {
    const registration = this.service.createDeviceRegistration(
      request.employee,
      request.deviceId,
      request.grantedPermissions,
    );
    this.devices.set(registration.deviceId, registration);
    return registration;
  }

  getDevice(deviceId: string): DeviceRegistration | undefined {
    return this.devices.get(deviceId);
  }

  getPermissionStatus(deviceId: string): PermissionState[] {
    return this.devices.get(deviceId)?.permissions ?? [];
  }

  checkIn(request: CheckInRequest): FieldVisit {
    const checkedInAt = request.checkedInAt ?? new Date().toISOString();
    const visitId = `${request.employeeId}:${request.clientId}:${checkedInAt}`;
    const visit: FieldVisit = {
      employeeId: request.employeeId,
      clientId: request.clientId,
      checkedInAt,
      latitude: request.latitude,
      longitude: request.longitude,
    };
    this.visits.set(visitId, visit);
    return visit;
  }

  checkOut(employeeId: string, clientId: string, checkedOutAt = new Date().toISOString()): FieldVisit | undefined {
    const candidates = [...this.visits.entries()].filter(
      ([, visit]) => visit.employeeId === employeeId && visit.clientId === clientId && !visit.checkedOutAt,
    );
    const latest = candidates.at(-1);
    if (!latest) return undefined;

    const [visitId, visit] = latest;
    const updated = { ...visit, checkedOutAt };
    this.visits.set(visitId, updated);
    return updated;
  }

  canTrackLocation(deviceId: string): boolean {
    const registration = this.devices.get(deviceId);
    return registration ? this.service.canTrackWorkLocation(registration) : false;
  }
}
