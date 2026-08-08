import { ipcMain, IpcMainInvokeEvent } from 'electron';

type IpcHandlerFunction = (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any;

/**
 * تسجيل قناة IPC بشكل آمن مع معالجة موحدة للأخطاء وإرجاع النتائج
 * @param channel اسم القناة
 * @param validator دالة اختيارية للتحقق من صحة المدخلات
 * @param handler الدالة المنفذة للطلب
 */
export function registerSafeIpcHandler(
  channel: string,
  validator: ((args: any[]) => boolean) | null,
  handler: IpcHandlerFunction
): void {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      // 1. التحقق من المدخلات إذا وُجد مدقق
      if (validator && !validator(args)) {
        console.warn(`[IPC Security] Invalid input parameters received on channel: ${channel}`);
        return { success: false, error: 'Invalid input parameters (Validation Failed)' };
      }

      // 2. تنفيذ العملية الأساسية
      const result = await handler(event, ...args);
      return { success: true, data: result };

    } catch (error: any) {
      console.error(`[IPC Error] Error handling channel "${channel}":`, error.message);
      return { success: false, error: error.message || 'Internal server/main error' };
    }
  });
}