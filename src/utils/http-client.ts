import axios, { AxiosError, AxiosResponse } from 'axios';

export const httpClient = axios.create({
    timeout: 5000
});

const MAX_RETRIES = 3;
const BACKOFF_DELAYS = [200, 400, 800];

httpClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
        const config = error.config;

        if (!config) {
            return Promise.reject(error);
        }

        const retryCount = (config as any).retryCount || 0;

        const isNetworkError = !error.response || error.code === 'ECONNABORTED' || error.message === 'Network Error';
        const isServiceUnavailable = error.response?.status === 503;

        if ((isNetworkError || isServiceUnavailable) && retryCount < MAX_RETRIES) {
            (config as any).retryCount = retryCount + 1;

            const delay = BACKOFF_DELAYS[retryCount];
            await new Promise(resolve => setTimeout(resolve, delay));

            return httpClient(config);
        }

        return Promise.reject(error);
    }
);

export const HttpClient = httpClient;
