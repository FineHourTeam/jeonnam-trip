// 네이버 지도 JS v3 — 이 앱이 쓰는 부분만 선언한다 (전체 타입 패키지를 들이지 않는다).
declare namespace naver.maps {
  class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
  }
  class LatLngBounds {
    constructor(sw?: LatLng, ne?: LatLng);
    extend(latlng: LatLng): LatLngBounds;
  }
  class Point {
    constructor(x: number, y: number);
    equals(p: Point): boolean;
  }
  class Size {
    constructor(width: number, height: number);
    equals(s: Size): boolean;
  }
  interface MapOptions {
    center: LatLng;
    zoom?: number;
    minZoom?: number;
    zoomControl?: boolean;
    zoomControlOptions?: { position?: number };
    mapDataControl?: boolean;
    scaleControl?: boolean;
    logoControl?: boolean;
    scrollWheel?: boolean;
    draggable?: boolean;
  }
  class Map {
    constructor(el: HTMLElement, opts: MapOptions);
    setCenter(c: LatLng): void;
    setZoom(z: number, effect?: boolean): void;
    getZoom(): number;
    panTo(c: LatLng): void;
    fitBounds(b: LatLngBounds, margin?: { top: number; right: number; bottom: number; left: number }): void;
    destroy(): void;
  }
  interface MarkerIcon {
    content: HTMLElement | string;
    anchor?: Point;
    size?: Size;
  }
  interface MarkerOptions {
    position: LatLng;
    map?: Map;
    icon?: MarkerIcon;
    title?: string;
    zIndex?: number;
    clickable?: boolean;
  }
  class Marker {
    constructor(o: MarkerOptions);
    setMap(m: Map | null): void;
    setPosition(p: LatLng): void;
    setIcon(i: MarkerIcon): void;
    setZIndex(z: number): void;
  }
  interface PolylineOptions {
    map?: Map;
    path: LatLng[];
    strokeColor?: string;
    strokeWeight?: number;
    strokeOpacity?: number;
    strokeStyle?: "solid" | "shortdash" | "shortdot";
    strokeLineCap?: "butt" | "round" | "square";
    strokeLineJoin?: "miter" | "round" | "bevel";
  }
  class Polyline {
    constructor(o: PolylineOptions);
    setMap(m: Map | null): void;
  }
  interface PointerEvent {
    coord: LatLng;
  }
  namespace Event {
    function addListener(target: unknown, type: string, handler: (e: PointerEvent) => void): object;
    function removeListener(listener: object): void;
  }
  const Position: { TOP_RIGHT: number; RIGHT_BOTTOM: number };
}

interface Window {
  navermap_authFailure?: () => void;
}
