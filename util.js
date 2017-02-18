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