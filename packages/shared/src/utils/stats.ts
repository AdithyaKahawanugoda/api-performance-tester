export class RunningStat {
  private n = 0;
  private mean = 0;
  private m2 = 0;
  private _min = Infinity;
  private _max = -Infinity;

  push(value: number): void {
    this.n++;
    const delta = value - this.mean;
    this.mean += delta / this.n;
    const delta2 = value - this.mean;
    this.m2 += delta * delta2;
    if (value < this._min) this._min = value;
    if (value > this._max) this._max = value;
  }

  get count(): number { return this.n; }
  get avg(): number { return this.n === 0 ? 0 : this.mean; }
  get variance(): number { return this.n < 2 ? 0 : this.m2 / (this.n - 1); }
  get stddev(): number { return Math.sqrt(this.variance); }
  get min(): number { return this.n === 0 ? 0 : this._min; }
  get max(): number { return this.n === 0 ? 0 : this._max; }
}
