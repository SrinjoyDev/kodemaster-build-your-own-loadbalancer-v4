import axios from "axios";
import axiosRetry from "axios-retry";

const REQUEST_TIMEOUT_MS = 5000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 200;

export const HttpClient = axios.create({
  timeout: REQUEST_TIMEOUT_MS,
});

axiosRetry(HttpClient, {
  retries: MAX_RETRIES,
  shouldResetTimeout: true,
  retryDelay: (retryCount) => BASE_RETRY_DELAY_MS * Math.pow(2, retryCount - 1),
  retryCondition: (error) => {
    const status = error.response?.status;

    if (status !== undefined) {
      return status >= 500 && status < 600;
    }

    return axiosRetry.isNetworkError(error) || error.code === "ECONNABORTED";
  },
});
