export interface ApiFetchOptions extends RequestInit {
    timeoutMs?: number;
}

export async function apiFetch(url: string, options: ApiFetchOptions = {}): Promise<any> {
    const { timeoutMs = 60000, ...fetchOptions } = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal
        });

        clearTimeout(id);

        let data;
        try {
            data = await response.json();
        } catch (e) {
            data = null;
        }

        if (!response.ok) {
            const error = new Error(data?.message || `HTTP xatolik: ${response.status}`);
            (error as any).status = response.status;
            (error as any).code = data?.code || 'UNKNOWN_ERROR';
            (error as any).data = data;
            throw error;
        }

        return data;
    } catch (error: any) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error('So\'rov vaqti tugadi. Iltimos, internetingizni tekshirib qayta urinib ko\'ring.');
        }
        throw error;
    }
}
