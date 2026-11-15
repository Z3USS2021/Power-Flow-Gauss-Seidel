export class Complex {
  readonly re: number;
  readonly im: number;

  constructor(re: number, im = 0) {
    this.re = re;
    this.im = im;
  }

  static readonly ZERO = new Complex(0, 0);
  static readonly ONE = new Complex(1, 0);

  static fromPolar(mag: number, deg: number): Complex {
    const rad = (deg * Math.PI) / 180;
    return new Complex(mag * Math.cos(rad), mag * Math.sin(rad));
  }

  static fromRadians(mag: number, rad: number): Complex {
    return new Complex(mag * Math.cos(rad), mag * Math.sin(rad));
  }

  get abs(): number {
    return Math.hypot(this.re, this.im);
  }

  get angleRad(): number {
    return Math.atan2(this.im, this.re);
  }

  get angleDeg(): number {
    return (Math.atan2(this.im, this.re) * 180) / Math.PI;
  }

  conj(): Complex {
    return new Complex(this.re, -this.im);
  }

  add(o: Complex): Complex {
    return new Complex(this.re + o.re, this.im + o.im);
  }

  sub(o: Complex): Complex {
    return new Complex(this.re - o.re, this.im - o.im);
  }

  mul(o: Complex | number): Complex {
    if (typeof o === 'number') {
      return new Complex(this.re * o, this.im * o);
    }
    return new Complex(
      this.re * o.re - this.im * o.im,
      this.re * o.im + this.im * o.re
    );
  }

  div(o: Complex | number): Complex {
    if (typeof o === 'number') {
      return new Complex(this.re / o, this.im / o);
    }
    const denom = o.re * o.re + o.im * o.im;
    if (denom === 0) {
      return new Complex(NaN, NaN);
    }
    return new Complex(
      (this.re * o.re + this.im * o.im) / denom,
      (this.im * o.re - this.re * o.im) / denom
    );
  }
}

/**
 * Formatea un número complejo evitando -0.0000, igual que fmt_c en power_flow.py.
 */
export function fmtC(z: Complex, dec = 4): string {
  const eps = Math.pow(10, -(dec + 1));
  const re = Math.abs(z.re) < eps ? 0.0 : z.re;
  const im = Math.abs(z.im) < eps ? 0.0 : z.im;
  const sign = im >= 0 ? '+' : '-';
  return `(${re.toFixed(dec)}${sign}${Math.abs(im).toFixed(dec)}j)`;
}

/**
 * Formatea un número complejo rectangular sin paréntesis para tablas.
 */
export function fmtRectPlain(z: Complex, dec = 5): string {
  const eps = Math.pow(10, -(dec + 1));
  const re = Math.abs(z.re) < eps ? 0.0 : z.re;
  const im = Math.abs(z.im) < eps ? 0.0 : z.im;
  const sign = im >= 0 ? '+' : '-';
  return `${re.toFixed(dec)}${sign}${Math.abs(im).toFixed(dec)}j`;
}

/**
 * Formatea un número complejo en forma polar, igual que fmt_pol en power_flow.py.
 */
export function fmtPol(z: Complex, decM = 5, decA = 2): string {
  const eps = Math.pow(10, -(decA + 1));
  const rawAng = z.angleDeg;
  const ang = Math.abs(rawAng) < eps ? 0.0 : rawAng;
  const sign = ang >= 0 ? '+' : '-';
  return `${z.abs.toFixed(decM)}∠${sign}${Math.abs(ang).toFixed(decA)}°`;
}
