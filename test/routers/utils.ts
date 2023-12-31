import request from "supertest";

const baseURL = `${process.env.API_DOMAIN}/v1/`;

export const requestApp = request(baseURL);
