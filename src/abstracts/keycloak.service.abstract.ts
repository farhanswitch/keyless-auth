export abstract class KeycloakService {
  protected readonly CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET;
  protected readonly CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID;
  protected readonly CLIENT_HASH = process.env.KEYCLOAK_CLIENT_HASH;
  protected readonly KEYCLOAK_SERVICE = process.env.KEYCLOAK_SERVICE;
  protected readonly REALM_NAME = process.env.KEYCLOAK_REALM_NAME;
}
