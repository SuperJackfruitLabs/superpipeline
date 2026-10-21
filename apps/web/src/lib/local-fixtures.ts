/** Local fixture controls never apply to a deployed origin; the server must also opt into DEV_AUTH. */
export function allowsLocalFixtures(dev: boolean, hostname: string): boolean {
  return dev || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}
