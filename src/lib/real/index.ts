import { realAi } from "./ai";
import { realCatalog } from "./catalog";
import { realDeals } from "./deals";
import { realDescribe } from "./describe";
import { realPhotos } from "./photos";
import { realWebsite } from "./website";
import { realRequests } from "./requests";

export const realApi = { ...realAi, ...realDescribe, ...realPhotos, ...realWebsite, ...realDeals, ...realCatalog, ...realRequests };
