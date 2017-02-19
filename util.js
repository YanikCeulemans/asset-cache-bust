//    log : String -> a -> a
/**
 * @description String -> a -> a
 */
exports.log = description => thing => {
    console.log(description, thing);
    return thing;
};

exports.id = x => x

exports.always = thing => never => thing


//      setObjectProperty : a -> String -> Object -> Object
exports.setObjectProperty = val => prop => obj => {
    obj[prop] = val;
    return obj;
}

//      mapObject : (a -> b) -> Object -> Object
exports.mapObject = fn => obj => {
    return Object.getOwnPropertyNames(obj)
        .reduce((acc, currPropName) => setObjectProperty(fn(obj[currPropName]))(currPropName)(acc), {});
};