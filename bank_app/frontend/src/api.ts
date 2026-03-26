/* api.ts — the single Axios instance for the whole app.
 *
 * Why Axios instead of the built-in fetch()?
 *   Axios automatically parses JSON responses, throws errors for 4xx/5xx
 *   status codes, and lets us set a baseURL once so every call only needs
 *   to specify the path (e.g. '/login') instead of the full URL.
 *
 * Why one shared instance?
 *   If the backend URL ever changes (e.g. moving to a real server), we only
 *   update it here instead of hunting through every file. It also means we
 *   could later add an auth token to every request in one place using
 *   Axios interceptors.
 */
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://127.0.0.1:5000/api',
})

export default api
