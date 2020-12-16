var config = require("./db-config.js");
var mysql = require("mysql");
config.connectionLimit = 10;
var connection = mysql.createPool(config);
const oracledb = require("oracledb");
oracledb.autoCommit = true;
let generateConnectionProps = () => {
  const connectString = `
  (DESCRIPTION=
    (ADDRESS=
      (PROTOCOL=TCP)
      (HOST=cis550proj.cgn43zyqcysl.us-east-1.rds.amazonaws.com)
      (PORT=1521)
    )
    (CONNECT_DATA=
      (SID=BOOKSDB)
      )
    )`;
  return {
    user: "admin",
    password: "welovesusan",
    connectString: connectString,
  };
};

async function runQuery(query, callback) {
  //   if (_debugMode) console.log(`oracledb running query: ${query}`);
  let connection;
  let result;
  const connectionProps = generateConnectionProps();

  try {
    connection = await oracledb.getConnection(connectionProps);
    result = await connection.execute(query);
  } catch (err) {
    console.error(err);
    return -1;
  } finally {
    if (connection) {
      try {
        await connection.close();
        callback(result);
      } catch (err) {
        console.error(err);
        return -1;
      }
    }
  }
}

/* -------------------------------------------------- */
/* ------------------- Route Handlers --------------- */
/* -------------------------------------------------- */
const searchAll = (req, res) => {
  var query = `WITH Rate AS (SELECT isbn, AVG(rating) AS avg_rating FROM Ratings GROUP BY isbn)
    SELECT Book.*, Rate.avg_rating
    FROM Book LEFT JOIN Rate ON Book.isbn = Rate.isbn
    WHERE Book.title LIKE '%${req.params.query}%' OR Book.author LIKE '%${req.params.query}%'
    ORDER BY Rate.avg_rating DESC`;

  runQuery(query, (result) => {
    if (result.rows) {
      console.log(result.rows);
      res.json(result.rows);
    }
  });

  // res.json([
  //   {
  //     isbn: 9780345453747,
  //     title: "The Ultimate Hitchhiker's Guide to the Galaxy",
  //     author: "Douglas Adams",
  //     language: "eng",
  //     num_pages: 815,
  //     publisher: "Del Rey Books",
  //     year_published: 2002,
  //     cover: "http://images.amazon.com/images/P/0345453743.01.LZZZZZZZ.jpg",
  //     format: "Paperback",
  //     genre: "Science-Fiction-Fantasy-Horror",
  //     price: 16.82,
  //     avg_rating: 5,
  //   },
  //   {
  //     isbn: 123,
  //     title: "test",
  //     author: "Alex",
  //     language: "eng",
  //     num_pages: 2,
  //     publisher: "Del Rey Books",
  //     year_published: 2000,
  //     cover: "http://images.amazon.com/images/P/0345453743.01.LZZZZZZZ.jpg",
  //     format: "Paperback",
  //     genre: "Science-Fiction-Fantasy-Horror",
  //     price: 42,
  //     avg_rating: 2.5,
  //   },
  // ]);
};
const searchBooks = (req, res) => {
  var query = `WITH Rate AS (SELECT isbn, AVG(rating) AS avg_rating FROM Ratings GROUP BY isbn)
    SELECT Book.*, Rate.avg_rating
    FROM Book LEFT JOIN Rate ON Book.isbn = Rate.isbn
    WHERE Book.title LIKE '${req.params.query}'
    ORDER BY Rate.avg_rating DESC`;

  runQuery(query, (result) => {
    if (result.rows) {
      console.log(result.rows);
      res.json(result.rows);
    }
  });
  // connection.query(query, (err, rows, fields) => {
  //   if (err) console.log(err);
  //   else {
  //     res.json(rows);
  //   }
  // });
};
const searchAuthors = (req, res) => {
  var query = `WITH Rate AS (SELECT isbn, AVG(rating) AS avg_rating FROM Ratings GROUP BY isbn)
    SELECT Book.*, Rate.avg_rating
    FROM Book LEFT JOIN Rate ON Book.isbn = Rate.isbn
    WHERE Book.author LIKE ${req.params.query}
    ORDER BY Rate.avg_rating DESC`;

  runQuery(query, (result) => {
    if (result.rows) {
      console.log(result.rows);
      res.json(result.rows);
    }
  });
  // connection.query(query, (err, rows, fields) => {
  //   if (err) console.log(err);
  //   else {
  //     res.json(rows);
  //   }
  // });
};
function getBook(req, res) {
  const isbn = req.params.isbn;
  const query = `
    SELECT *
    FROM Book
    WHERE isbn = ${isbn}
  `;
  runQuery(query, (result) => {
    if (result.rows.length == 0) {
      res.json({});
    } else {
      res.json(result.rows[0]);
    }
  });
}

function getAuthorRec(req, res) {
  const isbn = req.params.isbn;
  const query = `
    WITH Rate AS (SELECT isbn, AVG(rating) AS avg_rating FROM Ratings GROUP BY isbn)
    SELECT Book.*, Rate.avg_rating 
    FROM Book LEFT JOIN Rate ON Book.isbn = Rate.isbn
    WHERE Book.author IN 
    (SELECT author FROM Book WHERE isbn = ${isbn})
    ORDER BY Rate.avg_rating DESC
  `;

  runQuery(query, (result) => {
    res.json(result.rows);
  });
}

function getGenreRec(req, res) {
  const isbn = req.params.isbn;
  const query = `
    WITH Rate AS (SELECT isbn, AVG(rating) AS avg_rating FROM Ratings GROUP BY isbn)
    SELECT Book.*, Rate.avg_rating 
    FROM Book LEFT JOIN Rate ON Book.isbn = Rate.isbn
    WHERE genre IN (SELECT genre FROM Book WHERE isbn = ${isbn})
    ORDER BY Rate.avg_rating DESC
  `;

  runQuery(query, (result) => {
    if (result.rows) {
      console.log(result.rows);
      res.json(result.rows);
    }
  });
}

// fix error handling
function addToReadingList(req, res) {
  var isbn = req.params.isbn;
  var user = req.params.user;
  var query = `
    INSERT INTO ReadingList
    VALUES (${isbn}, ${user})
  `;

  runQuery(
    query,
    (result) => {
      res.status(200).json({ res: result });
    },
    (error) => {
      res.status(500).json({ error: error });
    }
  );
}
function getAvgRating(req, res) {
  const isbn = req.params.isbn;
  const query = `
    SELECT isbn, AVG(rating) AS rating
    FROM Ratings
    GROUP BY isbn
    HAVING isbn = ${isbn}
  `;

  runQuery(query, (result) => {
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    }
  });
}

function getUserRating(req, res) {
  const isbn = req.params.isbn;
  const user = req.params.isbn;

  const query = `
    SELECT rating
    FROM Ratings
    WHERE isbn = ${isbn} AND user_id = ${user}
  `;

  runQuery(query, (result) => {
    if (result) {
      console.log(result.rows);
      res.json(result.rows);
    }
  });
}
function getAllGenres(req, res) {
  res.json([
    { genre: "comedy" },
    { genre: "fiction" },
    { genre: "horror" },
    { genre: "mystery" },
    { genre: "biography" },
    { genre: "thriller" },
    { genre: "historical" },
    { genre: "nonfiction" },
    { genre: "short story" },
    { genre: "novel" },
  ]);
}
// Create new user
async function addUser(req, res) {
  const name = req.body.name;
  const username = req.body.username;
  const password = req.body.password;
  const location = req.body.location;
  const age = req.body.age;
  const user_id = new Date().getTime();
  if (user_id >= 1 && user_id <= 62000) {
    res.json({ status: "false" });
  } else {
    const query = `INSERT INTO Reader (user_id, location, age, username, password) VALUES ('${user_id}', '${location}', ${age}, '${username}', '${password}')`;
    runQuery(query, (result) => {
      //console.log(result);
      res.json({
        status: "true",
        user_id: user_id,
        name: name,
        username: username,
        password: password,
        location: location,
        age: age,
      });
    });
  }
}

// Log user
async function getUser(req, res) {
  const username = req.body.username;
  const password = req.body.password;
  const query = `SELECT * FROM Reader WHERE username = '${username}'`;
  runQuery(query, (result) => {
    //console.log(result);
    if (result.metaData[4] === password) {
      res.json({
        status: "true",
        user_id: result.metaData[0],
        username: result.metaData[3],
        password: result.metaData[4],
        location: result.metaData[1],
        age: result.metaData[2],
      });
    } else {
      res.json({ status: "false" });
    }
  });
}

// Get user's book
function getUserBooks(req, res) {
  const username = req.body.username;
  books.set({ username: username, books: Math.random() }, 0);
  var allBooks = [];
  for (const [key, value] of books.entries()) {
    if (key.username === username) {
      allBooks.push(key.books);
    }
  }
  console.log(allBooks);
  const info = users.get(username);
  res.json({
    status: "true",
    username: username,
    books: allBooks,
  });
}
function getTopInGenre(req, res) {
  res.json([
    {
      isbn: 9780345453747,
      title: "Thinking, Fast and Slow",
      author: "Douglas Adams",
      language: "eng",
      num_pages: 815,
      publisher: "Del Rey Books",
      year_published: 2002,
      cover:
        "https://images-na.ssl-images-amazon.com/images/I/41wI53OEpCL._SX332_BO1,204,203,200_.jpg",
      format: "Paperback",
      genre: "Science-Fiction-Fantasy-Horror",
      price: 16.82,
    },
    {
      isbn: 9780345453747,
      title: "The Ultimate Hitchhiker's Guide to the Galaxy",
      author: "Douglas Adams",
      language: "eng",
      num_pages: 815,
      publisher: "Del Rey Books",
      year_published: 2002,
      cover: "http://images.amazon.com/images/P/0345453743.01.LZZZZZZZ.jpg",
      format: "Paperback",
      genre: "Science-Fiction-Fantasy-Horror",
      price: 16.82,
    },
  ]);
}
// The exported functions, which can be accessed in index.js.
module.exports = {
  addUser: addUser,
  getUser: getUser,
  getUserBooks: getUserBooks,
  searchAll: searchAll,
  searchBooks: searchBooks,
  searchAuthors: searchAuthors,
  getBook: getBook,
  addToReadingList: addToReadingList,
  getAuthorRec: getAuthorRec,
  getGenreRec: getGenreRec,
  getAvgRating: getAvgRating,
  getUserRating: getUserRating,
  getAllGenres: getAllGenres,
  getTopInGenre: getTopInGenre,
};
