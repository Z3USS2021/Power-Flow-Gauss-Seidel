class Complex {
    constructor(re, im = 0) { this.re = re; this.im = im; }
    static fromPolar(mag, deg) {
        const rad = deg * Math.PI / 180;
        return new Complex(mag * Math.cos(rad), mag * Math.sin(rad));
    }
    get magnitude() { return Math.sqrt(this.re ** 2 + this.im ** 2); }
    get phase() { return Math.atan2(this.im, this.re) * 180 / Math.PI; }
    add(o) { return new Complex(this.re + o.re, this.im + o.im); }
    sub(o) { return new Complex(this.re - o.re, this.im - o.im); }
    mul(o) {
        if (typeof o === 'number') return new Complex(this.re * o, this.im * o);
        return new Complex(this.re * o.re - this.im * o.im, this.re * o.im + this.im * o.re);
    }
    div(o) {
        if (typeof o === 'number') return new Complex(this.re / o, this.im / o);
        const d = o.re ** 2 + o.im ** 2;
        return new Complex((this.re * o.re + this.im * o.im) / d, (this.im * o.re - this.re * o.im) / d);
    }
    formatMatlab(p = 4) {
        const s = this.im >= 0 ? "+" : "";
        return `${this.re.toFixed(p)} ${s} j${this.im.toFixed(p)} | ${this.magnitude.toFixed(p)} ∠ ${this.phase.toFixed(2)}°`;
    }
}