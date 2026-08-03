export type SolarCalendarDate = {
  year: number;
  month: number;
  day: number;
};

export type SolarTimes =
  | {
      status: "normal";
      sunrise: Date;
      sunset: Date;
    }
  | {
      status: "polar-day" | "polar-night";
      sunrise: null;
      sunset: null;
    };

const JULIAN_UNIX_EPOCH = 2_440_587.5;
const JULIAN_J2000 = 2_451_545;
const DAYS_PER_JULIAN_CENTURY = 36_525;
const APPARENT_SUN_ZENITH = 90.833;
const FLOATING_POINT_EPSILON = 1e-12;

/**
 * Calculates apparent sunrise and sunset with the NOAA/Meeus solar equations.
 * The standard 90.833° zenith accounts for refraction and the sun's radius.
 */
export function getSolarTimes(
  date: SolarCalendarDate,
  latitude: number,
  longitude: number,
): SolarTimes {
  if (!isValidSolarCoordinates(latitude, longitude)) {
    throw new RangeError("Solar coordinates are outside the valid range.");
  }

  const utcMidnight = Date.UTC(date.year, date.month - 1, date.day);
  const julianDay = utcMidnight / 86_400_000 + JULIAN_UNIX_EPOCH;
  const initialSolarPosition = getSolarPosition(julianDay);
  const initialHourAngle = getSunriseHourAngle(
    latitude,
    initialSolarPosition.declination,
  );

  if (initialHourAngle.status !== "normal") {
    return {
      status: initialHourAngle.status,
      sunrise: null,
      sunset: null,
    };
  }

  const initialSunriseMinutes = getSolarEventUtcMinutes(
    longitude,
    initialHourAngle.degrees,
    initialSolarPosition.equationOfTime,
    "sunrise",
  );
  const initialSunsetMinutes = getSolarEventUtcMinutes(
    longitude,
    initialHourAngle.degrees,
    initialSolarPosition.equationOfTime,
    "sunset",
  );
  const refinedSunrise = refineSolarEvent(
    julianDay,
    latitude,
    longitude,
    initialSunriseMinutes,
    "sunrise",
  );
  const refinedSunset = refineSolarEvent(
    julianDay,
    latitude,
    longitude,
    initialSunsetMinutes,
    "sunset",
  );

  return {
    status: "normal",
    sunrise: roundDateToMinute(
      new Date(utcMidnight + refinedSunrise * 60_000),
    ),
    sunset: roundDateToMinute(
      new Date(utcMidnight + refinedSunset * 60_000),
    ),
  };
}

export function isValidSolarCoordinates(
  latitude: unknown,
  longitude: unknown,
): boolean {
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function refineSolarEvent(
  julianDay: number,
  latitude: number,
  longitude: number,
  initialMinutes: number,
  event: "sunrise" | "sunset",
) {
  const solarPosition = getSolarPosition(
    julianDay + initialMinutes / 1_440,
  );
  const hourAngle = getSunriseHourAngle(
    latitude,
    solarPosition.declination,
  );

  if (hourAngle.status !== "normal") {
    return initialMinutes;
  }

  return getSolarEventUtcMinutes(
    longitude,
    hourAngle.degrees,
    solarPosition.equationOfTime,
    event,
  );
}

function getSolarEventUtcMinutes(
  longitude: number,
  hourAngle: number,
  equationOfTime: number,
  event: "sunrise" | "sunset",
) {
  const signedHourAngle = event === "sunrise" ? hourAngle : -hourAngle;
  return 720 - 4 * (longitude + signedHourAngle) - equationOfTime;
}

function getSolarPosition(julianDay: number) {
  const julianCentury =
    (julianDay - JULIAN_J2000) / DAYS_PER_JULIAN_CENTURY;
  const geometricMeanLongitude = normalizeDegrees(
    280.46646 +
      julianCentury *
        (36_000.76983 + 0.0003032 * julianCentury),
  );
  const geometricMeanAnomaly =
    357.52911 +
    julianCentury * (35_999.05029 - 0.0001537 * julianCentury);
  const eccentricity =
    0.016708634 -
    julianCentury * (0.000042037 + 0.0000001267 * julianCentury);
  const equationOfCenter =
    Math.sin(toRadians(geometricMeanAnomaly)) *
      (1.914602 -
        julianCentury * (0.004817 + 0.000014 * julianCentury)) +
    Math.sin(toRadians(2 * geometricMeanAnomaly)) *
      (0.019993 - 0.000101 * julianCentury) +
    Math.sin(toRadians(3 * geometricMeanAnomaly)) * 0.000289;
  const apparentLongitude =
    geometricMeanLongitude +
    equationOfCenter -
    0.00569 -
    0.00478 * Math.sin(toRadians(125.04 - 1934.136 * julianCentury));
  const meanObliquity =
    23 +
    (26 +
      (21.448 -
        julianCentury *
          (46.815 +
            julianCentury * (0.00059 - julianCentury * 0.001813))) /
        60) /
      60;
  const correctedObliquity =
    meanObliquity +
    0.00256 * Math.cos(toRadians(125.04 - 1934.136 * julianCentury));
  const declination = toDegrees(
    Math.asin(
      Math.sin(toRadians(correctedObliquity)) *
        Math.sin(toRadians(apparentLongitude)),
    ),
  );
  const obliquityTangent = Math.tan(toRadians(correctedObliquity / 2));
  const y = obliquityTangent * obliquityTangent;
  const longitudeRadians = toRadians(geometricMeanLongitude);
  const anomalyRadians = toRadians(geometricMeanAnomaly);
  const equationOfTime =
    4 *
    toDegrees(
      y * Math.sin(2 * longitudeRadians) -
        2 * eccentricity * Math.sin(anomalyRadians) +
        4 *
          eccentricity *
          y *
          Math.sin(anomalyRadians) *
          Math.cos(2 * longitudeRadians) -
        0.5 * y * y * Math.sin(4 * longitudeRadians) -
        1.25 *
          eccentricity *
          eccentricity *
          Math.sin(2 * anomalyRadians),
    );

  return { declination, equationOfTime };
}

function getSunriseHourAngle(latitude: number, declination: number):
  | { status: "normal"; degrees: number }
  | { status: "polar-day" | "polar-night" } {
  const latitudeRadians = toRadians(latitude);
  const declinationRadians = toRadians(declination);
  const hourAngleCosine =
    Math.cos(toRadians(APPARENT_SUN_ZENITH)) /
      (Math.cos(latitudeRadians) * Math.cos(declinationRadians)) -
    Math.tan(latitudeRadians) * Math.tan(declinationRadians);

  if (hourAngleCosine > 1 + FLOATING_POINT_EPSILON) {
    return { status: "polar-night" };
  }
  if (hourAngleCosine < -1 - FLOATING_POINT_EPSILON) {
    return { status: "polar-day" };
  }

  return {
    status: "normal",
    degrees: toDegrees(Math.acos(Math.min(1, Math.max(-1, hourAngleCosine)))),
  };
}

function roundDateToMinute(date: Date) {
  return new Date(Math.round(date.getTime() / 60_000) * 60_000);
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}
