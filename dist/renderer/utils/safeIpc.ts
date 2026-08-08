export async function safeIpcInvoke<T>(channel: string, payload?: any, timeoutMs = 10000): Promise<{ success: boolean; data?: T; error?: string }> {
    return Promise.race([
        (window as any).electronAPI.invoke(channel, payload).then((result: any) => {
            if (!result) return { success: false, error: 'Empty response from main process' };
            return result;
        }).catch((err: any) => ({
            success: false,
            error: err?.message || 'IPC invocation failed'
        })),
        new Promise<{ success: boolean; error: string }>((_, reject) => 
            setTimeout(() => reject({ success: false, error: 'Operation timed out' }), timeoutMs)
        )
    ]).catch((err: any) => ({
        success: false,
        error: err?.error || 'Timeout or network disruption'
    }));
}