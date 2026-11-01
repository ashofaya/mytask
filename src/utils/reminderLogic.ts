export type NotificationPermissionState =
  | NotificationPermission
  | 'unsupported'

export function getNotificationPermission(
  notificationApi?: Pick<typeof Notification, 'permission'>,
): NotificationPermissionState {
  return notificationApi ? notificationApi.permission : 'unsupported'
}

export function shouldPollReminders(
  notificationsEnabled: boolean,
  permission: NotificationPermissionState,
): boolean {
  return notificationsEnabled && permission === 'granted'
}
