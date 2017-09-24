type $required<X> = ()=>X;
type $optional<X> = ()=>X | void;

type $joiObject<X> = {
  max: ()=>$joiObject<X>;
  min: ()=>$joiObject<X>;
  email: ()=>$joiObject<X>;
  allow: ()=>$joiObject<X>;
  required: $required<X>;
  optional: $optional<X>;
  regex: ()=>$joiObject<X>;
}

// type $try<X1, X2> = (x1: X1, x2: X2)=> X1 | X2;

// type $alternatives = {
//   try: $try;
// };

type Joi = {
  string: ()=>$joiObject<string>,
  number: ()=>$joiObject<number>,
  any: ()=>$joiObject<any>,
  object: ()=>{
    keys: <X>(x: X)=>X,
  },
  array: ()=>{
    items: <X>(x: X)=>$joiObject<Array<X>>,
  }
};

declare module 'joi' {
  declare var exports: Joi;
}
