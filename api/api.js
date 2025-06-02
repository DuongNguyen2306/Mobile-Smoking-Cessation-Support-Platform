// api.js
import axios from "axios";

const API_URL = "http://192.168.0.198:5000/auth"; // 👈 đúng IP máy bạn
//


export const login = async (email, password) => {
  return axios.post(`${API_URL}/login`, { email, password });
};

export const register = async (email, password, username, role = "user") => {
  return axios.post(`${API_URL}/register`, { email, password, username, role });
};
