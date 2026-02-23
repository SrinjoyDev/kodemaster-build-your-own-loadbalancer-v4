import axios from "axios";
import axiosRetry from "axios-retry";

export const HttpClient = axios.create({
  timeout: 5000,
});

axiosRetry(HttpClient, {
  retries: 3,
  retryDelay: (retryCount) => 200 * Math.pow(2, retryCount - 1), // 200, 400, 800
  retryCondition: (error) => {
    const status = error.response?.status;
    return axiosRetry.isNetworkError(error) || (status !== undefined && status >= 500 && status < 600);
  },
});