const SHIPPING_METHODS = Object.freeze({
  HOME_DELIVERY: 'home_delivery',
  CONVENIENCE_STORE: 'convenience_store'
});

const SHIPPING_RATES = Object.freeze({
  HOME_DELIVERY: 120,
  CONVENIENCE_STORE: 60,
  FREE_HOME_DELIVERY_THRESHOLD: 1500,
  REMOTE_AREA_SURCHARGE: 200,
  SAME_DAY_SURCHARGE: 250
});

function calculateShipping({
  subtotal,
  shippingMethod = SHIPPING_METHODS.HOME_DELIVERY,
  isRemoteArea = false,
  isSameDay = false
}) {
  if (!Number.isFinite(subtotal) || subtotal < 0) {
    throw new TypeError('subtotal 必須為大於或等於 0 的數字');
  }

  if (!Object.values(SHIPPING_METHODS).includes(shippingMethod)) {
    throw new TypeError('shippingMethod 必須為 home_delivery 或 convenience_store');
  }

  if (typeof isRemoteArea !== 'boolean' || typeof isSameDay !== 'boolean') {
    throw new TypeError('isRemoteArea 與 isSameDay 必須為 boolean');
  }

  const baseFee = shippingMethod === SHIPPING_METHODS.HOME_DELIVERY
    ? (subtotal >= SHIPPING_RATES.FREE_HOME_DELIVERY_THRESHOLD ? 0 : SHIPPING_RATES.HOME_DELIVERY)
    : SHIPPING_RATES.CONVENIENCE_STORE;
  const remoteAreaSurcharge = isRemoteArea ? SHIPPING_RATES.REMOTE_AREA_SURCHARGE : 0;
  const sameDaySurcharge = isSameDay ? SHIPPING_RATES.SAME_DAY_SURCHARGE : 0;
  const shippingFee = baseFee + remoteAreaSurcharge + sameDaySurcharge;

  return {
    shippingMethod,
    baseFee,
    remoteAreaSurcharge,
    sameDaySurcharge,
    shippingFee,
    totalAmount: subtotal + shippingFee
  };
}

module.exports = {
  SHIPPING_METHODS,
  SHIPPING_RATES,
  calculateShipping
};
