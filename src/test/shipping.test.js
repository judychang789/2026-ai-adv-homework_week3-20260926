const { SHIPPING_METHODS, calculateShipping } = require('../utils/shipping');
describe('Shipping', () => {
  it('宅配基本運費',()=>expect(calculateShipping({subtotal:1000}).shippingFee).toBe(120));
  it('超商取貨費用',()=>expect(calculateShipping({subtotal:1000,shippingMethod:SHIPPING_METHODS.CONVENIENCE_STORE}).shippingFee).toBe(60));
  it('商品小計 1,499 元',()=>expect(calculateShipping({subtotal:1499}).shippingFee).toBe(120));
  it('商品小計 1,500 元免基本運費',()=>expect(calculateShipping({subtotal:1500}).shippingFee).toBe(0));
  it('偏遠地區附加費',()=>expect(calculateShipping({subtotal:1000,isRemoteArea:true}).shippingFee).toBe(320));
  it('當日急件附加費',()=>expect(calculateShipping({subtotal:1000,isSameDay:true}).shippingFee).toBe(370));
  it('多項附加費同時成立',()=>expect(calculateShipping({subtotal:1000,isRemoteArea:true,isSameDay:true}).shippingFee).toBe(570));
  it('滿額免運與附加費同時成立',()=>{const x=calculateShipping({subtotal:1500,isRemoteArea:true,isSameDay:true});expect(x.shippingFee).toBe(450);expect(x.totalAmount).toBe(1950)});
});
