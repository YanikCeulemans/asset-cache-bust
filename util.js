const Task = require('data.task');
const Maybe = require('data.maybe');

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

//      taskFromNullable : e -> a -> Task e a
exports.taskFromNullable = rejectVal => nullable => {
    if (nullable == null) return Task.rejected(rejectVal);
    return Task.of(nullable);
};


// This function can be created using the folktale core.operators.get and Maybe.fromNullable functions
//      getObjectProperty : String -> Object -> Maybe Any
exports.getObjectProperty = prop => obj => {
    if (prop == null || obj == null || obj[prop] == null) return Maybe.Nothing();
    return Maybe.Just(obj[prop]);
};