export interface User {
  uid: string;
  email: string;
  role: 'admin' | 'user';
  trial_start: any;
  access_granted: boolean;
  request_pending?: boolean;
  trial_expired?: boolean;
  server_time?: number;
  created_at?: any;
}

export interface BeamInput {
  lx: number; // cm
  load: number; // kN/m
  width: number; // cm
  height: number; // cm
  fck: number; // MPa
  fyk: number; // MPa
  cover: number; // cm
  preferredDiameter?: number;
}

export interface BeamResult {
  as_calc: number; // cm2
  as_min: number; // cm2
  as_final: number; // cm2
  x: number; // cm
  is_over_reinforced: boolean;
  bars: {
    count: number;
    diameter: number;
  };
}

export interface PillarInput {
  width: number; // cm
  height: number; // cm
  fck: number; // MPa
  fyk: number; // MPa
  nd: number; // kN (Axial load)
  md: number; // kNm (Moment)
  preferredDiameter?: number;
}

export interface SlabInput {
  lx: number; // m
  ly: number; // m
  fck: number; // MPa
  fyk: number; // MPa
  load: number; // kN/m2
  thickness: number; // cm
  preferredDiameter?: number;
}

export interface SlabResult {
  as_final: number;
  as_min: number;
  is_error: boolean;
  error_message?: string;
  bars: {
    diameter: number;
    spacing: number;
  };
  deflection: number; // mm
  deflection_limit: number; // mm
}
