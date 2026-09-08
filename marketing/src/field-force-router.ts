import { FieldForceApi, type CheckInRequest, type RegisterDeviceRequest } from "./field-force-api";

export function createFieldForceRouter(api = new FieldForceApi()) {
  return {
    registerDevice(request: RegisterDeviceRequest) {
      return api.registerDevice(request);
    },
    permissionStatus(deviceId: string) {
      return api.getPermissionStatus(deviceId);
    },
    checkIn(request: CheckInRequest) {
      return api.checkIn(request);
    },
    checkOut(employeeId: string, clientId: string) {
      return api.checkOut(employeeId, clientId);
    },
    canTrackLocation(deviceId: string) {
      return api.canTrackLocation(deviceId);
    },
  };
}
