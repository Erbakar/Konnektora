import { Controller, Get, Headers, Query } from "@nestjs/common";
import { LocationsService } from "./locations.service";

@Controller("locations")
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get("reverse")
  reverse(@Query("latitude") latitude = "", @Query("longitude") longitude = "") {
    return this.locations.reverse(latitude.trim() ? Number(latitude) : NaN, longitude.trim() ? Number(longitude) : NaN);
  }

  @Get("geocode")
  geocode(
    @Query("q") query = "",
    @Headers("accept-language") language = "tr",
  ) {
    return this.locations.geocode(query, language);
  }
}
